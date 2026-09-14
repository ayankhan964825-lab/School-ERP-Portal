import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { validateCoupon } from '../../../lib/database';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code')?.trim();

    if (!code) {
      return new Response(JSON.stringify({ valid: false, error: 'No code provided' }), { status: 400 });
    }

    let customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value) || undefined;

    // Pass a very high order total to bypass minimum order amount checks.
    // We only want to check if the coupon is generally valid for this user (not expired, not self-referral, not already used up, etc.)
    const result = await validateCoupon(code, 999999, undefined, undefined, customerId);

    if (result.valid) {
      return new Response(JSON.stringify({ 
        valid: true, 
        message: `🎉 Special Offer Unlocked! Affiliate code ${code.toUpperCase()} applied.`
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: result.error 
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (error: any) {
    console.error('[CheckOffer] Error:', error);
    return new Response(JSON.stringify({ valid: false, error: 'Internal server error' }), { status: 500 });
  }
};
