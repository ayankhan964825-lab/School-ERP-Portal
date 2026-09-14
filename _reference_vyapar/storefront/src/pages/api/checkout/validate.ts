import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { validateCheckoutItems } from '../../../lib/checkout';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { items, couponCode, couponCodes, state, paymentMethod, customerPhone: bodyPhone, pincode, latitude, longitude } = body;
        
        const finalCoupons = couponCodes || (couponCode ? [couponCode] : []);
    
        const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value) || undefined;
        let customerPhone = bodyPhone || undefined;
        let customerEmail = undefined;
        
        if (customerId) {
            const { getCustomerById } = await import('../../../lib/database');
            const cust = await getCustomerById(customerId);
            if (cust) {
                customerPhone = cust.phone || customerPhone;
                customerEmail = cust.email;
            }
        }
        
        const addressToUse = { pincode, latitude, longitude, state };
        const validation = await validateCheckoutItems(items, finalCoupons, state, customerPhone, customerEmail, paymentMethod || 'cod', addressToUse, customerId);
        
        // Group items by store_id
        const groupedItems: Record<string, any[]> = {};
        for (const item of validation.validatedItems) {
          const sId = item.store_id || locals.storeId || 'platform';
          if (!groupedItems[sId]) groupedItems[sId] = [];
          groupedItems[sId].push(item);
        }

        // Run routing to determine delivery ETA per item
        const { processAndRouteOrder } = await import('../../../lib/orderRouter');
        const finalRoutedItems = [];
        let hasQcDowngrade = false;
        for (const sId of Object.keys(groupedItems)) {
          const routedResult = await processAndRouteOrder(groupedItems[sId], addressToUse, sId);
          finalRoutedItems.push(...routedResult.routedItems);
          if (routedResult.qcDowngraded) hasQcDowngrade = true;
        }
    
        const wasQuantityAdjusted = validation.validatedItems.some((i: any) => i._adjusted_qty);
        const wasItemDropped = Array.isArray(items) && items.length !== validation.validatedItems.length;
        
        let adjustedMessage = validation.validatedItems.filter((i: any) => i._adjusted_qty).map((i: any) => i._adjusted_msg).join(', ');
        if (wasItemDropped) {
            if (adjustedMessage) adjustedMessage += '\n';
            adjustedMessage += 'Some items were removed because they are out of stock or no longer available.';
        }

        return new Response(JSON.stringify({
          success: true,
          subtotal: validation.subtotal,
          shipping: validation.shipping,
          discount: validation.discount,
          couponDiscount: validation.couponDiscountAmount || 0,
          milestoneDiscount: validation.milestoneDiscountAmount || 0,
          prepaidDiscount: validation.prepaidDiscount || 0,
          finalAmount: validation.finalAmount,
          validatedItems: finalRoutedItems,
          qcDowngraded: hasQcDowngrade,
          couponResult: validation.couponResult ? {
            valid: validation.couponResult.valid,
            discount: validation.couponResult.discount,
            error: validation.couponResult.error,
            codes: finalCoupons,
            coupons: validation.couponResult.coupons || []
          } : null,
          freeGift: validation.freeGift || null,
          wasAdjusted: wasQuantityAdjusted || wasItemDropped,
          adjustedMessage: adjustedMessage
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    
      } catch (error: any) {
        console.error('Validation error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message || 'Validation failed' }), { status: 500 });
      }
  });
};
