import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    if (!isSupabase || !supabaseAdmin) {
        return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), { status: 500 });
      }
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'super_admin')) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 403 });
      }
    try {
        const body = await request.json();
        const { request_id, decision } = body;
    
        if (!request_id || !decision || !['approved', 'rejected'].includes(decision)) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid input parameters' }), { status: 400 });
        }
    
        // Call the atomic process RPC
        const { data: result, error: processErr } = await supabaseAdmin.rpc('atomic_process_recharge', {
          p_request_id: request_id,
          p_decision: decision,
          p_admin_name: ctx.adminName
        });
    
        if (processErr) {
          console.error('[Process Recharge] Failed:', processErr);
          return new Response(JSON.stringify({ success: false, error: processErr.message }), { status: 500 });
        }
    
        if (!result.success) {
          return new Response(JSON.stringify({ success: false, error: result.error }), { status: 400 });
        }
    
        return new Response(JSON.stringify({ success: true, message: `Recharge request ${decision} successfully` }), { status: 200 });
    
      } catch (error) {
        console.error('[Process Recharge] Server Error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500 });
      }
  });
};
