import type { APIRoute } from 'astro';
import { saveAddressIfNew, incrementCouponUsage, saveMarketplaceOrder, decrementInventoryStock, updateOrderStatus, getSettings } from '../../../lib/database';
import { sendMetaCapiEvent, hashData } from '../../../lib/tracking';
import { sendNotifications } from '../../../lib/notifications';
import { runAutoAssign } from '../../../lib/autoAssign';
import { validateCheckoutItems } from '../../../lib/checkout';
import { getTenantId, storeContext } from '../../../lib/storeContext';
import { generateMasterOrderId, generateSubOrderId } from '../../../lib/orderIds';

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { customer, rawAddress, items, amount: frontendAmount, couponCode, couponCodes, state } = body;
    
        // Securely validate the checkout total
        const finalCoupons = couponCodes || (couponCode ? [couponCode] : []);
        const addressToUse = rawAddress || customer;
        const paymentMethod = body.paymentMethod || 'zero';
        const validation = await validateCheckoutItems(items, finalCoupons, state, customer?.phone, customer?.email, paymentMethod, addressToUse?.pincode);
        
        if (validation.freeGift) {
          validation.validatedItems.push({
            id: validation.freeGift.id,
            product_id: validation.freeGift.id,
            name: validation.freeGift.name,
            variant_name: validation.freeGift.variantName || '',
            quantity: 1,
            price: 0,
            image: validation.freeGift.image || '',
            is_free_gift: true,
            track_inventory: !validation.freeGift.isCustom
          });
        }
    
        // Check if frontend amount mismatched backend amount. We proceed with backend amount.
        const finalAmount = validation.finalAmount;
        
        if (finalAmount > 0) {
          throw new Error('Order amount is not zero. Please select a valid payment method.');
        }
    
        // Group items by store_id for Multi-Seller checkout
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
          const routedResult = await processAndRouteOrder(groupedItems[sId], addressToUse, sId);
          finalRoutedItems.push(...routedResult.routedItems);
        }

        const splitGroupedItems: Record<string, any[]> = {};
        for (const item of finalRoutedItems) {
           const locId = item.location_id || 'none';
           const splitKey = `${item.store_id || defaultStoreId}||${item.q_commerce_enabled ? 'qc' : 'std'}||${locId}`;
           if (!splitGroupedItems[splitKey]) splitGroupedItems[splitKey] = [];
           splitGroupedItems[splitKey].push(item);
        }
        
        Object.keys(groupedItems).forEach(k => delete groupedItems[k]);
        for (const key in splitGroupedItems) {
           groupedItems[key] = splitGroupedItems[key];
        }
    
        const masterOrderId = generateMasterOrderId();
    
        const masterOrder = {
          displayId: masterOrderId,
          customer_id: customer?.id || null,
          customer: customer || {},
          address: addressToUse,
          subtotal: validation.subtotal,
          shipping: validation.shipping,
          amount: finalAmount,
          paymentMethod: '100%_discount',
          paymentStatus: 'completed'
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
    
        await saveMarketplaceOrder(masterOrder, subOrders, { 
          coupons: finalCoupons, 
          incrementCoupons: true,
          incrementAffiliate: true 
        });

        // Auto-deliver purely digital sub-orders
        for (const subOrder of subOrders) {
           const isPurelyDigital = subOrder.items.every((item: any) => item.is_digital);
           if (isPurelyDigital) {
               await updateOrderStatus(subOrder.orderId, 'delivered', subOrder.storeId)
                   .catch(err => console.error('[Auto-Delivery] Failed for digital order:', err));
           }
        }
    

        // Save address for future checkout
        if (customer?.phone && addressToUse) {
          await saveAddressIfNew(customer.phone, addressToUse, undefined, customer.id).catch(err => console.error('[Checkout] Save address error:', err));
        }
    
        // Send notifications
        await sendNotifications({
          type: 'new_order',
          storeId: locals.storeId,
          orderId: masterOrderId,
          customerName: customer?.name || 'Guest',
          customerPhone: customer?.phone,
          customerEmail: customer?.email,
          amount: 0,
          paymentMethod: 'zero_cost',
          address: addressToUse,
          items: validation.validatedItems
        }).catch(err => console.error('Notification error:', err));
        
        // INSTANT QC AUTO-ASSIGN: Trigger rider assignment instantly
        await runAutoAssign().catch(err => console.error('Instant Auto-assign error:', err));
    
        // Trigger Meta CAPI
        try {
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
                value: 0.01,
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
          message: 'Free Order placed successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    
      } catch (error) {
        console.error('Error processing COD order:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Internal Server Error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  });
};
