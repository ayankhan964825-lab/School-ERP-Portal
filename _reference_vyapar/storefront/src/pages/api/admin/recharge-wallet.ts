import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'finance')) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden: You do not have permission to recharge wallet.' }), { status: 403 });
    }

    if (!isSupabase || !supabaseAdmin) {
        return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), { status: 500 });
      }
    const storeId = locals.storeId;
    if (!storeId) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
      }
    try {
        const body = await request.json();
        const { amount, utr_number } = body;
    
        if (!amount || amount <= 0 || !utr_number) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid input parameters' }), { status: 400 });
        }
    
        // Fix: Prevent instant fake-money crediting by requiring Super Admin approval
        const { data: result, error: walletErr } = await supabaseAdmin.rpc('atomic_request_recharge', {
          p_store_id: storeId,
          p_amount: Math.abs(amount),
          p_utr_number: utr_number
        });
    
        if (walletErr) {
          console.error('[Recharge] Failed to process recharge request:', walletErr);
          return new Response(JSON.stringify({ success: false, error: walletErr.message }), { status: 500 });
        }
    
        if (!result.success) {
          return new Response(JSON.stringify({ success: false, error: result.error }), { status: 400 });
        }
    
        return new Response(JSON.stringify({ success: true, message: 'Recharge request submitted for admin approval.' }), { status: 200 });
    
      } catch (error) {
        console.error('[Recharge] Server Error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500 });
      }
  });
};
