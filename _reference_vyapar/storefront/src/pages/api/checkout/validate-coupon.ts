import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { validateCoupon } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const { code, subtotal } = await request.json();
        
        if (!code || subtotal === undefined) {
          return new Response(JSON.stringify({ valid: false, error: 'Code and subtotal are required' }), { status: 400 });
        }
    
        const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value) || undefined;
        const result = await validateCoupon(code, Number(subtotal), undefined, undefined, customerId);
    
        if (result.valid) {
          return new Response(JSON.stringify({
            valid: true,
            discount: result.discount,
            coupons: result.coupons,
            coupon: result.coupon
          }), { status: 200 });
        } else {
          return new Response(JSON.stringify({
            valid: false,
            error: result.error
          }), { status: 400 });
        }
      } catch (error) {
        console.error('[ValidateCoupon] API Error:', error);
        return new Response(JSON.stringify({ valid: false, error: 'Internal server error' }), { status: 500 });
      }
  });
};
