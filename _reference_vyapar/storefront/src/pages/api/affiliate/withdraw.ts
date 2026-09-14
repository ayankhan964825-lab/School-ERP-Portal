import type { APIRoute } from 'astro';
import { getAffiliates, getSettings, supabaseAdmin } from '../../../lib/database';
import { sendNotifications } from '../../../lib/notifications';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const id = cookies.get('vyaparpe_affiliate_id')?.value;
        if (!id) return new Response('Unauthorized', { status: 401 });

        // Security: CSRF Protection (Origin / Referer validation)
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');
        const host = request.headers.get('host');
        
        // Ensure request comes from same origin
        const isSecureOrigin = origin 
          ? origin.includes(host || '') 
          : referer ? referer.includes(host || '') : false;
          
        // We require either a valid origin or referer (basic CSRF defense for POST API)
        if (!isSecureOrigin && process.env.NODE_ENV === 'production') {
          return new Response(JSON.stringify({ error: 'CSRF token mismatch or forbidden origin.' }), { status: 403 });
        }
    
        const affiliates = await getAffiliates();
        const user = affiliates.find((a: any) => a.id === id);
        if (!user) return new Response('User not found', { status: 404 });
    
        const settings = await getSettings();
        const payoutDays = parseInt(settings.affiliate_payout_days) || 30;
        const payoutThreshold = parseInt(settings.affiliate_payout_threshold) || 100;
    
        // Atomically lock, calculate available balance, check pending, and create payout
        const { data: result, error: rpcErr } = await supabaseAdmin.rpc('atomic_affiliate_withdrawal', {
          p_affiliate_id: user.id,
          p_payout_days: payoutDays,
          p_payout_threshold: payoutThreshold
        });
    
        if (rpcErr) {
          console.error('Failed to process atomic affiliate withdrawal:', rpcErr);
          return new Response(JSON.stringify({ error: 'Transaction failed. Please try again later.' }), { status: 500 });
        }
    
        if (!result.success) {
          return new Response(JSON.stringify({ error: result.error }), { status: 400 });
        }
    
        // Send Admin Notification asynchronously
        sendNotifications({
          type: 'affiliate_withdrawal',
          affiliateName: result.affiliate_name,
          amount: result.amount,
          upiId: result.upi_id,
        }).catch(console.error);
    
        return new Response(JSON.stringify({ success: true, amount: result.amount }), { status: 200 });
      } catch (err: any) {
        console.error('Withdrawal error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
