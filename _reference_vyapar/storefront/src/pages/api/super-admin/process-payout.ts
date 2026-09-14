import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canProcessPayouts } from '../../../lib/permissions';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canProcessPayouts(ctx)) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 403 });
        }
    if (!supabaseAdmin) {
            return new Response(JSON.stringify({ success: false, error: "Database misconfigured" }), { status: 500 });
        }
    try {
            if (!validateCsrfToken(request, cookies)) {
                return new Response(JSON.stringify({ error: 'CSRF token missing or invalid' }), { status: 403 });
            }
    
            const body = await request.json();
            const { payout_id, utr_number } = body;
    
            if (!payout_id || !utr_number) {
                return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400 });
            }
    
            // 2. Fetch the payout request to ensure it's pending
            const { data: requestRecord, error: fetchErr } = await supabaseAdmin
                .from(TABLES.PAYOUT_REQUESTS)
                .select('status, amount, store_id')
                .eq('id', payout_id)
                .single();
    
            if (fetchErr || !requestRecord) {
                return new Response(JSON.stringify({ success: false, error: "Payout request not found" }), { status: 404 });
            }
    
            if (requestRecord.status !== 'pending') {
                return new Response(JSON.stringify({ success: false, error: "Payout request is already processed or rejected" }), { status: 400 });
            }
    
            // 3. Update the payout request
            const { error: updateErr } = await supabaseAdmin
                .from(TABLES.PAYOUT_REQUESTS)
                .update({
                    status: 'completed',
                    utr_number: utr_number,
                    processed_at: new Date().toISOString(),
                    processed_by: ctx.adminId
                })
                .eq('id', payout_id);
    
            if (updateErr) throw updateErr;
    
            // Optionally, increment 'total_payouts' on the wallet? No, total_payouts is not tracked like that right now, 
            // the wallet_transactions table handles the ledger. Since we already debited the wallet during 'request-payout',
            // we don't need to touch the balance again here.
    
            await logAdminActivity(ctx, request, 'Processed Payout', `Amount: ₹${requestRecord.amount} | Payout ID: ${payout_id}`);
    
            return new Response(JSON.stringify({ success: true, message: "Payout marked as completed" }), { status: 200 });
    
        } catch (error: any) {
            console.error('Process payout error:', error);
            return new Response(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), { status: 500 });
        }
  });
};
