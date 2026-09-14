import type { APIRoute } from 'astro';
import { initiatePhonePePayment } from '../../../lib/phonepe';
import { validateCheckoutItems } from '../../../lib/checkout';
import { saveAddressIfNew, saveMarketplaceOrder, supabaseAdmin, isSupabase } from '../../../lib/database';
import { getTenantId, storeContext } from '../../../lib/storeContext';
import { generateMasterOrderId, generateSubOrderId } from '../../../lib/orderIds';

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { amount: frontendAmount, customer, rawAddress, items, couponCode, couponCodes, state } = body;
    
        const finalCoupons = couponCodes || (couponCode ? [couponCode] : []);
        const addressToUse = rawAddress || customer;
        const stateToUse = state || addressToUse?.state;
        const validation = await validateCheckoutItems(items, finalCoupons, stateToUse, customer?.phone, customer?.email, 'phonepe', addressToUse);
        const amount = validation.finalAmount;
    
        const orderId = generateSubOrderId();
    
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
    
        const protocol = new URL(request.url).protocol;
        const host = new URL(request.url).host;
        const callbackUrl = `${protocol}//${host}/api/checkout/phonepe-callback`;
    
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
    
        const masterOrderId = generateMasterOrderId();
    
        const masterOrder = {
          displayId: masterOrderId,
          customer_id: customer?.id || null,
          customer: customer || {},
          address: addressToUse,
          subtotal: validation.subtotal,
          shipping: validation.shipping,
          amount,
          paymentMethod: 'phonepe',
          paymentStatus: 'pending'
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
    
        // BUG 3 FIX: Save order as pending_payment but DON'T deduct inventory yet.
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

        // Inventory will be deducted in phonepe-callback.ts after payment is confirmed.
        await saveMarketplaceOrder(masterOrder, subOrders, { 
          skipInventory: true,
          incrementAffiliate: false
        });
        if (customer?.phone && addressToUse) {
          await saveAddressIfNew(customer.phone, addressToUse).catch(err => console.error('[Checkout] Save address error:', err));
        }
    
        const finalCallbackUrl = `${callbackUrl}?orderId=${masterOrderId}`;
        const result = await initiatePhonePePayment(Math.round(amount), masterOrderId, finalCallbackUrl);
    
        if (result.success) {
          // In a real production app, we would store the pending order in DB here before redirecting.
          // But since we want to avoid stale abandoned carts in the DB, we can just pass the cart data 
          // through the callback if mock, or rely on the frontend to clear it on success.
          return new Response(JSON.stringify({
            success: true,
            redirectUrl: result.redirectUrl,
            orderId: masterOrderId
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
    
        return new Response(JSON.stringify({
          success: false,
          error: result.error || 'Failed to initiate PhonePe payment'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
    
      } catch (error) {
        console.error('PhonePe checkout error:', error);
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
