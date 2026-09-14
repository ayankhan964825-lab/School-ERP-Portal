import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { verifyOTP } from '../../../lib/twilio';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const { phone, otp, hash, expiry } = await request.json();
        
        if (!phone || !otp) {
          return new Response(JSON.stringify({ success: false, error: 'Phone and OTP are required' }), { status: 400 });
        }
    
        const isValid = await verifyOTP(phone, otp, hash, expiry);
        if (!isValid) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid or expired OTP' }), { status: 400 });
        }
    
        const { saveCustomer } = await import('../../../lib/database');
        const customer = await saveCustomer({ phone });

        // Set secure auth cookie — scoped to exact hostname to prevent cross-tenant leakage
        const requestUrl = new URL(request.url);
        cookies.set('customer_auth', signCustomerAuth(customer.id), {
          path: '/',
          domain: requestUrl.hostname, // Scope to this exact subdomain only
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict', // Upgrade: prevents cookie sending on cross-site navigation
          maxAge: 60 * 60 * 24 * 30 // 30 days
        });
    
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
      }
  });
};
