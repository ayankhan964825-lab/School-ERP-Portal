import type { APIRoute } from 'astro';
import { createRazorpayOrder } from '../../../lib/razorpay';
import { initiatePhonePePayment } from '../../../lib/phonepe';
import { validateCheckoutItems } from '../../../lib/checkout';
import { saveMarketplaceOrder, saveAddressIfNew, getSettings, supabaseAdmin, isSupabase } from '../../../lib/database';
import { generateMasterOrderId, generateSubOrderId } from '../../../lib/orderIds';
import { getTenantId, storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { customer, items, couponCode, couponCodes, state, rawAddress, forceGateway } = body;
        
        // --- 1. DETERMINE GATEWAY AND FALLBACK ---
        const settings = await getSettings();
        let primaryGateway = settings?.primary_domestic_gateway;
        let isFallbackAllowed = true;
        
        if (forceGateway) {
            primaryGateway = forceGateway;
            isFallbackAllowed = false;
        } else if (!primaryGateway) {
            // Backward compatibility
            if (settings?.razorpay_enabled !== false && settings?.razorpay_enabled !== 'false') primaryGateway = 'razorpay';
            else if (settings?.phonepe_enabled !== false && settings?.phonepe_enabled !== 'false') primaryGateway = 'phonepe';
            else throw new Error("No payment gateways are enabled.");
        }
        
        const fallbackGateway = primaryGateway === 'razorpay' ? 'phonepe' : 'razorpay';
        const isFallbackEnabled = settings[`${fallbackGateway}_enabled`] !== false && settings[`${fallbackGateway}_enabled`] !== 'false';
        
        // --- 2. VALIDATION (Same for both) ---
        const finalCoupons = couponCodes || (couponCode ? [couponCode] : []);
        const addressToUse = rawAddress || customer;
        const stateToUse = state || addressToUse?.state;
        const validation = await validateCheckoutItems(items, finalCoupons, stateToUse, customer?.phone, customer?.email, primaryGateway, addressToUse);
        
        if (validation.freeGift) {
          validation.validatedItems.push({
            id: validation.freeGift.id,
            product_id: validation.freeGift.id,
            name: validation.freeGift.name,
            variant_name: validation.freeGift.variantName || '',
            quantity: 1,
            price: 0,
            total: 0,
            image: validation.freeGift.image || '',
            is_free_gift: true,
            track_inventory: !validation.freeGift.isCustom
          });
        }
    
        const amount = validation.finalAmount;
        const masterOrderId = generateMasterOrderId();
        
        // --- 3. ATTEMPT PAYMENT WITH SMART FALLBACK ---
        let activeGateway = primaryGateway;
        let rzpResult = null;
        let ppResult = null;
        
        const tryRazorpay = async () => {
            const receipt = `rcpt_${Date.now().toString().slice(-8)}`;
            return await createRazorpayOrder(amount, receipt);
        };
        
        const tryPhonePe = async () => {
            const protocol = new URL(request.url).protocol;
            const host = new URL(request.url).host;
            const callbackUrl = `${protocol}//${host}/api/checkout/phonepe-callback?orderId=${masterOrderId}`;
            return await initiatePhonePePayment(amount, masterOrderId, callbackUrl);
        };
        
        try {
            if (primaryGateway === 'razorpay') {
                rzpResult = await tryRazorpay();
                if (!rzpResult.success) throw new Error(rzpResult.error || "Razorpay Init Failed");
            } else if (primaryGateway === 'phonepe') {
                ppResult = await tryPhonePe();
                if (!ppResult.success) throw new Error(ppResult.error || "PhonePe Init Failed");
            }
        } catch (error) {
            console.error(`[Gateway Router] Primary gateway (${primaryGateway}) failed:`, error);
            const fallbackGateway = settings.secondary_payment_gateway || 'razorpay';
            if (primaryGateway === 'phonepe' && fallbackGateway === 'razorpay') {
               // SURFACING PHONEPE ERRORS TEMPORARILY
               console.error('[Checkout Router] Primary gateway failed:', primaryGateway, error);
               return new Response(JSON.stringify({
                 success: false,
                 error: error instanceof Error ? error.message : "PhonePe Init Failed (No Fallback)"
               }), {
                 status: 500,
                 headers: { 'Content-Type': 'application/json' }
               });
            } else {
              console.error('[Checkout Router] Primary gateway failed:', primaryGateway, error);
              // Fallback
              activeGateway = fallbackGateway;
              try {
                  if (fallbackGateway === 'razorpay') {
                      rzpResult = await tryRazorpay();
                      if (!rzpResult.success) throw new Error(rzpResult.error || "Razorpay Fallback Failed");
                  } else if (fallbackGateway === 'phonepe') {
                      ppResult = await tryPhonePe();
                      if (!ppResult.success) throw new Error(ppResult.error || "PhonePe Fallback Failed");
                  }
              } catch (fallbackError) {
                  console.error('[Checkout Router] Fallback gateway failed:', activeGateway, fallbackError);
                  return new Response(JSON.stringify({ success: false, error: 'Both payment gateways failed to initialize.' }), {
                      status: 500,
                      headers: { 'Content-Type': 'application/json' }
                  });
              }
            }
        }
        
        // --- 4. PREPARE DB SAVE ---
        const groupedItems: Record<string, any[]> = {};
        const defaultStoreId = getTenantId() !== 'SUPER_ADMIN_BYPASS' ? getTenantId() : null;
        
        for (const item of validation.validatedItems) {
          const sId = item.store_id || defaultStoreId;
          if (!sId) throw new Error(`Missing store_id for product: ${item.name}`);
          if (!groupedItems[sId]) groupedItems[sId] = [];
          groupedItems[sId].push(item);
        }

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
    
        const masterOrder: any = {
          displayId: masterOrderId,
          customer_id: customer?.id || null,
          customer: customer || {},
          address: addressToUse,
          subtotal: validation.subtotal,
          shipping: validation.shipping,
          amount,
          paymentMethod: activeGateway,
          paymentStatus: 'pending'
        };
        
        if (activeGateway === 'razorpay' && rzpResult) {
            masterOrder.paymentId = rzpResult.id;
        }
    
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
    
        // --- 5. SAVE DB (Same for both) ---
        if (isSupabase && supabaseAdmin) {
            const { error: rpcError } = await supabaseAdmin.rpc('atomic_create_checkout_reservations', {
                p_checkout_id: masterOrderId,
                p_items: finalRoutedItems,
                p_store_id: locals.storeId
            });
            if (rpcError) {
                return new Response(JSON.stringify({ success: false, error: rpcError.message || 'Items went out of stock during checkout. Please try again.' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        await saveMarketplaceOrder(masterOrder, subOrders, { 
          skipInventory: true, 
          coupons: finalCoupons, 
          incrementCoupons: false,
          incrementAffiliate: false
        });
        if (customer?.phone && addressToUse) {
          await saveAddressIfNew(customer.phone, addressToUse, undefined, customer.id).catch(err => console.error('[Checkout] Save address error:', err));
        }
    
        // --- 6. RETURN APPROPRIATE RESPONSE ---
        if (activeGateway === 'razorpay' && rzpResult) {
            return new Response(JSON.stringify({
              success: true,
              gateway: 'razorpay',
              id: rzpResult.id,
              amount: rzpResult.amount,
              currency: rzpResult.currency || 'INR',
              key_id: rzpResult.key_id,
              mock: rzpResult.mock || false,
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
        } else if (activeGateway === 'phonepe' && ppResult) {
            return new Response(JSON.stringify({
              success: true,
              gateway: 'phonepe',
              redirectUrl: ppResult.redirectUrl,
              orderId: masterOrderId
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
        }
        
        throw new Error("Invalid state: Gateway succeeded but no result available.");
    
      } catch (error) {
        console.error('Checkout error in Unified Router:', error);
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
