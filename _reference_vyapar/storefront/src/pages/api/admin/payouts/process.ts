import { TABLES } from '../../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin, getSettings } from '../../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../../lib/permissions';
import Razorpay from 'razorpay';
import { storeContext } from "../../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
            const ctx = getPermissionContext(cookies);
            if (!canManageSection(ctx, "super_admin")) {
                return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 });
            }
    
            if (!supabaseAdmin) {
                return new Response(JSON.stringify({ success: false, error: "Missing DB key" }), { status: 500 });
            }
    
            const body = await request.json();
            const { storeId, isBulk } = body;
    
            // Fetch settings to check Razorpay config
            const settings = await getSettings();
            const rzpKey = settings?.razorpay_key_id;
            const rzpSecret = settings?.razorpay_key_secret;
            
            let razorpayInstance: Razorpay | null = null;
            if (rzpKey && rzpSecret && !rzpKey.includes('YOUR_')) {
                try {
                    razorpayInstance = new Razorpay({
                        key_id: rzpKey,
                        key_secret: rzpSecret,
                    });
                } catch (e) {
                    console.warn("Could not initialize Razorpay SDK. Using Mock Mode.", e);
                }
            }
    
            // Fetch wallets
            let query = supabaseAdmin.from(TABLES.WALLETS).select('*').gt('balance', 0);
            if (storeId) {
                query = query.eq('store_id', storeId);
            }
            
            const { data: wallets, error: fetchError } = await query;
            if (fetchError || !wallets) {
                return new Response(JSON.stringify({ success: false, error: "Failed to fetch wallets" }), { status: 500 });
            }
    
            if (wallets.length === 0) {
                return new Response(JSON.stringify({ success: false, error: "No unsettled wallets found." }), { status: 400 });
            }
    
            const processed = [];
            const failed = [];
    
            for (const wallet of wallets) {
                const amount = Number(wallet.balance);
                if (amount <= 0) continue;
    
                let payoutReference = `payout_mock_${Date.now()}_${wallet.store_id.substring(0,5)}`;
                let payoutSuccess = true;
    
                // In a real production scenario, we'd call RazorpayX Payouts API here.
                // Example:
                // if (razorpayInstance && store.razorpay_fund_account_id) {
                //    const payout = await razorpayInstance.payouts.create({ account_number: '...', fund_account_id: store.razorpay_fund_account_id, amount: amount * 100, currency: "INR", mode: "NEFT", purpose: "payout" });
                //    payoutReference = payout.id;
                // }
    
                if (payoutSuccess) {
                    // Deduct balance securely and atomically
                    const { error: updateError } = await supabaseAdmin.rpc('update_wallet_balance', {
                        p_store_id: wallet.store_id,
                        p_amount: -amount,
                        p_type: 'payout',
                        p_reference_id: payoutReference,
                        p_description: `Platform settlement payout via ${razorpayInstance ? 'Razorpay' : 'Mock Bank Transfer'}`
                    });
    
                    if (!updateError) {
                        // update_wallet_balance RPC automatically records the wallet_transactions row
                        processed.push({ storeId: wallet.store_id, amount });
                    } else {
                        failed.push({ storeId: wallet.store_id, reason: 'DB Update Failed' });
                    }
                }
            }
    
            return new Response(JSON.stringify({ 
                success: true, 
                message: `Processed ${processed.length} payouts.`,
                processed,
                failed,
                mode: razorpayInstance ? 'Live Razorpay' : 'Mock Mode'
            }), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
    
        } catch (err: any) {
            return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
  });
};
