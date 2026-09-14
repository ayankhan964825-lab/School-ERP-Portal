import type { APIRoute } from 'astro';
import { updateAffiliate, getAffiliates } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const id = cookies.get('vyaparpe_affiliate_id')?.value;
        if (!id) return new Response('Unauthorized', { status: 401 });
    
        const data = await request.json();
        let { upi_id, bank_account_name, bank_account_number, bank_ifsc, referral_code } = data;
    
        // Security: Enforce max lengths to prevent DoS via large strings
        upi_id = typeof upi_id === 'string' ? upi_id.slice(0, 100) : '';
        bank_account_name = typeof bank_account_name === 'string' ? bank_account_name.slice(0, 100) : '';
        bank_account_number = typeof bank_account_number === 'string' ? bank_account_number.slice(0, 50) : '';
        bank_ifsc = typeof bank_ifsc === 'string' ? bank_ifsc.slice(0, 20) : '';
    
        const updates: any = {
          upi_id,
          bank_account_name,
          bank_account_number,
          bank_ifsc
        };
    
        if (referral_code && typeof referral_code === 'string') {
          const code = referral_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (code.length >= 4 && code.length <= 20) {
            const all = await getAffiliates();
            const exists = all.find((a: any) => a.referral_code === code && a.id !== id);
            if (exists) {
              return new Response(JSON.stringify({ error: 'This referral code is already taken by another partner' }), { status: 400 });
            }
            
            // Ensure no collision with native coupons
            const { getCoupons } = await import('../../../lib/database');
            const allCoupons = await getCoupons();
            const couponExists = allCoupons.find((c: any) => c.code.toUpperCase() === code && c.affiliate_id !== id);
            if (couponExists) {
               return new Response(JSON.stringify({ error: 'This code is already in use by the system' }), { status: 400 });
            }
    
            updates.referral_code = code;
          }
        }
    
        const updated = await updateAffiliate(id, updates);
    
        return new Response(JSON.stringify({ success: true, user: updated }), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
  });
};
