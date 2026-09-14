import { verifyCustomerAuth, signCustomerAuth } from '../../lib/auth';
﻿import type { APIRoute } from 'astro';
import { validateCoupon } from '../../lib/database';
import { storeContext } from "../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const { code, total } = await request.json();
    
        if (!code) {
          return new Response(JSON.stringify({ valid: false, error: 'Please enter a coupon code' }), { status: 200 });
        }
    
        const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value) || undefined;
        const result = await validateCoupon(code, total || 0, undefined, undefined, customerId);
        return new Response(JSON.stringify(result), { status: 200 });
      } catch (error) {
        return new Response(JSON.stringify({ valid: false, error: 'Server error' }), { status: 500 });
      }
  });
};
