import type { APIRoute } from 'astro';
import { createRazorpayOrder } from '../../../lib/razorpay';
import { validateCheckoutItems } from '../../../lib/checkout';
import { generateMasterOrderId, generateSubOrderId } from '../../../lib/orderIds';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { customer, items, couponCode, couponCodes, state, rawAddress } = body;
    
        const finalCoupons = couponCodes || (couponCode ? [couponCode] : []);
        const addressToUse = rawAddress || customer;
        const stateToUse = state || addressToUse?.state;
        const validation = await validateCheckoutItems(items, finalCoupons, stateToUse, customer?.phone, customer?.email, 'razorpay', addressToUse);
        
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
    
        const amount = validation.finalAmount;
    
        const masterOrderId = generateMasterOrderId();
        const receipt = `rcpt_${Date.now().toString().slice(-8)}`;
        const result = await createRazorpayOrder(amount, receipt);
    
        if (result.success) {
          // TASK 3A FIX: Save pending_payment order before returning ID
          const { saveMarketplaceOrder, saveAddressIfNew, supabaseAdmin, isSupabase } = await import('../../../lib/database');
          const { getTenantId } = await import('../../../lib/storeContext');
    
          // Group items by store_id
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
    
          const masterOrder = {
            displayId: masterOrderId,
            customer_id: customer?.id || null,
            customer: customer || {},
            address: addressToUse,
            subtotal: validation.subtotal,
            shipping: validation.shipping,
            amount,
            paymentMethod: 'razorpay',
            paymentId: result.id, // we save razorpay_order_id here
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
    
          if (isSupabase && supabaseAdmin) {
              const { error: rpcError } = await supabaseAdmin.rpc('atomic_create_checkout_reservations', {
                  p_checkout_id: result.id,
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

          // Save order as pending_payment but DON'T deduct inventory yet.
          // We pass the coupons to lock them and check limits, but DO NOT increment yet (webhook will increment).
          await saveMarketplaceOrder(masterOrder, subOrders, { 
            skipInventory: true, 
            coupons: finalCoupons, 
            incrementCoupons: false,
            incrementAffiliate: false
          });
          if (customer?.phone && addressToUse) {
            await saveAddressIfNew(customer.phone, addressToUse).catch(err => console.error('[Checkout] Save address error:', err));
          }
    
          return new Response(JSON.stringify({
            success: true,
            id: result.id,
            amount: result.amount,
            currency: result.currency || 'INR',
            key_id: result.key_id,
            mock: result.mock || false,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
    
        return new Response(JSON.stringify({
          success: false,
          error: result.error || 'Failed to create payment order'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
    
      } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to generate payment order'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  });
};
