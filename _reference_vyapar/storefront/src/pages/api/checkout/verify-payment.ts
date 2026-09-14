import type { APIRoute } from 'astro';
import { verifyRazorpayPayment } from '../../../lib/razorpay';
import { saveAddressIfNew, incrementCouponUsage, saveMarketplaceOrder } from '../../../lib/database';
import { sendNotifications } from '../../../lib/notifications';
import { runAutoAssign } from '../../../lib/autoAssign';
import { validateCheckoutItems } from '../../../lib/checkout';
import { getTenantId, storeContext } from '../../../lib/storeContext';
import { generateMasterOrderId, generateSubOrderId } from '../../../lib/orderIds';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { customer, rawAddress, items, amount: frontendAmount, paymentMethod, couponCode, couponCodes, razorpay_order_id, razorpay_payment_id, razorpay_signature, state } = body;
        
        // Securely validate the checkout total
        const finalCoupons = couponCodes || (couponCode ? [couponCode] : []);
        const addressToUse = rawAddress || customer;
        const stateToUse = state || addressToUse?.state;
        const validation = await validateCheckoutItems(items, finalCoupons, stateToUse, customer?.phone, customer?.email, paymentMethod === 'razorpay' ? 'razorpay_verify' : paymentMethod);
        const finalAmount = validation.finalAmount;
    
        // Verify payment signature
        const isVerified = await verifyRazorpayPayment(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature || '' // Empty for mock mode
        );
    
        if (!isVerified) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Payment verification failed'
          }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
    
        // Cross-check the Razorpay order amount matches our backend-calculated amount
        // This prevents Order ID swapping attacks (paying ₹1 for a ₹10,000 cart)
        if (razorpay_order_id && !razorpay_order_id.startsWith('order_mock_')) {
          try {
            const { getSettings } = await import('../../../lib/database');
            const settings = await getSettings();
            const keyId = settings.razorpay_key_id?.trim();
            const keySecret = settings.razorpay_key_secret?.trim();
            if (keyId && keySecret) {
              const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
              const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
                headers: { 'Authorization': `Basic ${auth}` }
              });
              const orderData = await orderRes.json();
              const paidAmountPaise = orderData.amount || 0;
              const expectedPaise = Math.round(finalAmount * 100);
              if (Math.abs(paidAmountPaise - expectedPaise) > 100) { // Allow ₹1 tolerance
                console.error(`[Payment] AMOUNT MISMATCH! Razorpay: ${paidAmountPaise} paise, Expected: ${expectedPaise} paise`);
                return new Response(JSON.stringify({
                  success: false,
                  error: 'Payment amount does not match order total. Possible fraud attempt.'
                }), { status: 400, headers: { 'Content-Type': 'application/json' } });
              }
            }
          } catch (amountErr) {
            // Network failure during amount cross-check.
            // HMAC signature was already verified above (line 24) — payment IS authentic.
            // Do NOT block the order — log warning and proceed.
            console.warn('[Payment] Razorpay amount cross-check failed (network/API issue). HMAC already verified. Proceeding:', amountErr);
          }
        }
    
    // TASK 3B: Idempotency & Look up existing order
        const { supabaseAdmin, isSupabase } = await import('../../../lib/database');
        let orderEntityId = null;
        let masterOrderId = null;
        let orderIdForNotification = null;
    
        if (isSupabase && supabaseAdmin && razorpay_order_id && !razorpay_order_id.startsWith('order_mock_')) {
          const { getSettings } = await import('../../../lib/database');
          const settings = await getSettings();
          const isTrackingOff = (settings.global_inventory_tracking !== true && settings.global_inventory_tracking !== 'true');
    
          // TASK 5 FIX: 100% ACID Payment Confirmation
          const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('atomic_confirm_payment', {
            p_lookup_id: razorpay_order_id,
            p_razorpay_payment_id: razorpay_payment_id || razorpay_order_id,
            p_skip_deduction: isTrackingOff,
            p_store_id: locals.storeId
          });
    
          if (rpcErr) {
            console.error('[Verify Payment RPC Error]', rpcErr);
            throw new Error(`Failed to confirm payment: ${rpcErr.message || rpcErr.details}`);
          }
    
          if (rpcData && rpcData.already_paid) {
            console.log(`[Verify Payment] Order ${rpcData.order_id} already paid. Ignoring duplicate call.`);
            return new Response(JSON.stringify({
              success: true,
              orderId: rpcData.order_id,
              message: 'Payment verified and order placed successfully'
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
    
          masterOrderId = rpcData?.order_id;
          orderIdForNotification = masterOrderId;


        } else {
          // Fallback: If not found or in Mock Mode, create a new one (legacy behavior)
          const groupedItems: Record<string, any[]> = {};
          const defaultStoreId = getTenantId() !== 'SUPER_ADMIN_BYPASS' ? getTenantId() : null;
          
          for (const item of validation.validatedItems) {
            const sId = item.store_id || defaultStoreId;
            if (!sId) throw new Error(`Missing store_id for product: ${item.name}`);
            if (!groupedItems[sId]) groupedItems[sId] = [];
            groupedItems[sId].push(item);
          }

          // Route items through multi-warehouse engine (Sprint 1.4)
          const { processAndRouteOrder } = await import('../../../lib/orderRouter');
          const finalRoutedItems: any[] = [];
          for (const sId of Object.keys(groupedItems)) {
            const routeResult = await processAndRouteOrder(groupedItems[sId], addressToUse, sId);
            finalRoutedItems.push(...routeResult.routedItems);
          }

          // Re-group by storeId, delivery_type AND location_id to ensure split sub-orders
          const splitGroupedItems: Record<string, any[]> = {};
          for (const item of finalRoutedItems) {
             const locId = item.location_id || 'none';
             const splitKey = `${item.store_id || defaultStoreId}||${item.q_commerce_enabled ? 'qc' : 'std'}||${locId}`;
             if (!splitGroupedItems[splitKey]) splitGroupedItems[splitKey] = [];
             splitGroupedItems[splitKey].push(item);
          }
          
          // Re-assign groupedItems for suborder generation
          Object.keys(groupedItems).forEach(k => delete groupedItems[k]);
          for (const key in splitGroupedItems) {
             groupedItems[key] = splitGroupedItems[key];
          }
    
          masterOrderId = generateMasterOrderId();
          orderIdForNotification = masterOrderId;
    
          const masterOrder = {
            displayId: masterOrderId,
            customer: customer || {},
            address: addressToUse,
            subtotal: validation.subtotal,
            shipping: validation.shipping,
            amount: finalAmount,
            paymentMethod: paymentMethod || 'razorpay',
            paymentId: razorpay_payment_id || null,
            paymentStatus: 'paid'
          };
    
          const subOrders = [];
          const storeIds = Object.keys(groupedItems);
          let remainingShipping = validation.shipping || 0;
          let remainingCommission = validation.affiliateInfo?.commissionAmount || 0;
          const consumedDiscount: Record<string, number> = {};
    
          for (let i = 0; i < storeIds.length; i++) {
            const splitKey = storeIds[i];
            const actualStoreId = splitKey.split('||')[0];
            const sItems = groupedItems[splitKey];
            const sSubtotal = sItems.reduce((acc: number, it: any) => acc + (it.price * (it.quantity || 1)), 0);
            
            const isLast = i === storeIds.length - 1;
            const proportion = validation.subtotal > 0 ? (sSubtotal / validation.subtotal) : (1 / storeIds.length);
            
            const sShipping = isLast ? remainingShipping : Number(((validation.shipping || 0) * proportion).toFixed(2));
            
            // Fix #6: Proportionally split discount per store to prevent double-claim
            const totalStoreDiscount = validation.discountByStore ? (validation.discountByStore[actualStoreId] || 0) : 0;
            const alreadyConsumed = consumedDiscount[actualStoreId] || 0;
            const remainingStoreDiscount = totalStoreDiscount - alreadyConsumed;
            const remainingSubOrdersForStore = storeIds.slice(i + 1).filter(k => k.split('||')[0] === actualStoreId).length;
            const sDiscount = remainingSubOrdersForStore === 0 ? remainingStoreDiscount : Number((remainingStoreDiscount * proportion).toFixed(2));
            consumedDiscount[actualStoreId] = alreadyConsumed + sDiscount;
            
            const sCommission = isLast ? remainingCommission : Number(((validation.affiliateInfo?.commissionAmount || 0) * proportion).toFixed(2));
            
            if (!isLast) {
                remainingShipping = Number((remainingShipping - sShipping).toFixed(2));
                remainingCommission = Number((remainingCommission - sCommission).toFixed(2));
            }
            
            const sAmount = Number((sSubtotal + sShipping - sDiscount).toFixed(2));
    
            const isQc = sItems.some((i: any) => i.q_commerce_enabled || i.is_q_commerce_only);

            subOrders.push({
              orderId: generateSubOrderId(isQc),
              storeId: actualStoreId,
              items: sItems,
              delivery_type: isQc ? 'q_commerce_inhouse' : 'standard',
              target_eta: sItems[0]?.target_eta,
              subtotal: sSubtotal,
              shipping: sShipping,
              discount: sDiscount,
              amount: sAmount,
              couponCode: validation.couponResult ? finalCoupons.join(",") : null,
              affiliate_id: validation.affiliateInfo?.id || null,
              affiliate_commission: sCommission
            });
          }
    
          orderIdForNotification = subOrders[0].orderId;
    
          await saveMarketplaceOrder(masterOrder, subOrders, {
            skipInventory: false,
            coupons: finalCoupons,
            incrementCoupons: true
          });


        }
    
        // Save address for future checkout
        if (customer?.phone && addressToUse) {
          await saveAddressIfNew(customer.phone, addressToUse).catch(err => console.error('[Checkout] Save address error:', err));
        }
    
        // Send notifications
        await sendNotifications({
          type: 'new_order',
          storeId: locals.storeId,
          orderId: orderIdForNotification,
          customerName: customer?.name || 'Guest',
          customerPhone: customer?.phone,
          customerEmail: customer?.email,
          amount: finalAmount,
          paymentMethod: 'razorpay',
          address: addressToUse,
          items: validation.validatedItems
        }).catch(err => console.error('Notification error:', err));
        
        // INSTANT QC AUTO-ASSIGN: Trigger rider assignment instantly
        const { runAutoAssign } = await import('../../../lib/autoAssign');
        await runAutoAssign().catch(err => console.error('Instant Auto-assign error:', err));
    
        // Trigger Meta CAPI
        try {
          const { getSettings } = await import('../../../lib/database');
          const { sendMetaCapiEvent, hashData } = await import('../../../lib/tracking');
          const settings = await getSettings(locals.storeId);
          if (settings?.meta_pixel_id && settings?.meta_capi_token) {
            const cookieHeader = request.headers.get('cookie') || '';
            const fbpMatch = cookieHeader.match(/_fbp=([^;]+)/);
            const fbcMatch = cookieHeader.match(/_fbc=([^;]+)/);
            const fbp = fbpMatch ? fbpMatch[1] : undefined;
            const fbc = fbcMatch ? fbcMatch[1] : undefined;

            await sendMetaCapiEvent(settings.meta_pixel_id, settings.meta_capi_token, {
              eventName: 'Purchase',
              eventTime: Date.now(),
              eventId: masterOrderId,
              eventSourceUrl: request.headers.get('origin') || request.url,
              userData: {
                em: hashData(customer?.email) ? [hashData(customer.email) as string] : undefined,
                ph: hashData(customer?.phone, 'phone') ? [hashData(customer.phone, 'phone') as string] : undefined,
                fn: hashData(customer?.name?.split(' ')[0]) || undefined,
                ln: hashData(customer?.name?.split(' ').slice(1).join(' ')) || undefined,
                client_ip_address: request.headers.get('x-forwarded-for') || undefined,
                client_user_agent: request.headers.get('user-agent') || undefined,
                fbp,
                fbc,
              },
              customData: {
                value: finalAmount,
                currency: 'INR',
                content_ids: validation.validatedItems.map((i: any) => i.id),
                content_type: 'product',
                num_items: validation.validatedItems.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0)
              }
            });
          }
        } catch (e) {
          console.error('Meta CAPI trigger error:', e);
        }
    
        return new Response(JSON.stringify({
          success: true,
          orderId: masterOrderId,
          message: 'Payment verified and order placed successfully'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
      } catch (error) {
        console.error('Error verifying payment:', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Internal Server Error'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
  });
};
