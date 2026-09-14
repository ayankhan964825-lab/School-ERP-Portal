import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'finance')) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden: You do not have permission to manage payouts.' }), { status: 403 });
    }

    const storeId = locals.storeId;
    if (!storeId || storeId === 'SUPER_ADMIN_BYPASS') {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
      }
    if (!supabaseAdmin) {
        return new Response(JSON.stringify({ success: false, error: "Database misconfigured" }), { status: 500 });
      }
    try {
        const body = await request.json();
        const { amount, bank_name, bank_account_no, bank_ifsc } = body;
    
        if (!amount || amount < 100) {
          return new Response(JSON.stringify({ success: false, error: "Minimum payout amount is ₹100" }), { status: 400 });
        }
        if (!bank_name || !bank_account_no || !bank_ifsc) {
          return new Response(JSON.stringify({ success: false, error: "All bank details are required" }), { status: 400 });
        }
    
        // 1. Atomically check balance, deduct, and create payout request in ONE SQL TRANSACTION
        const { data: result, error: rpcErr } = await supabaseAdmin.rpc('atomic_request_payout', {
          p_store_id: storeId,
          p_amount: amount,
          p_bank_name: bank_name,
          p_bank_account_no: bank_account_no,
          p_bank_ifsc: bank_ifsc
        });
    
        if (rpcErr) {
          console.error('Failed to process atomic payout request:', rpcErr);
          throw new Error("Transaction failed. Try again.");
        }
    
        if (!result.success) {
          return new Response(JSON.stringify({ success: false, error: result.error }), { status: 400 });
        }
    
        return new Response(JSON.stringify({ success: true, message: "Payout requested successfully" }), { status: 200 });
    
      } catch (error: any) {
        console.error('Payout request error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), { status: 500 });
      }
  });
};
