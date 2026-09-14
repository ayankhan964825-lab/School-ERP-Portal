import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canApproveMarketplace } from '../../../lib/permissions';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canApproveMarketplace(ctx)) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 403 });
        }
    if (!supabaseAdmin) {
            return new Response(JSON.stringify({ success: false, error: "Database misconfigured" }), { status: 500 });
        }
    try {
            if (!validateCsrfToken(request, cookies)) {
                return new Response(JSON.stringify({ error: 'CSRF token missing or invalid' }), { status: 403 });
            }
    
            const { listing_id, status, admin_notes } = await request.json();
    
            if (!listing_id || !status) {
                return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400 });
            }
            
            if (!['approved', 'rejected'].includes(status)) {
                return new Response(JSON.stringify({ success: false, error: "Invalid status" }), { status: 400 });
            }
    
            const isActive = status === 'approved';
    
            const { error: updateErr } = await supabaseAdmin
                .from(TABLES.MARKETPLACE_LISTINGS)
                .update({
                    status: status,
                    admin_notes: admin_notes || null,
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', listing_id);
    
            if (updateErr) throw updateErr;
    
            await logAdminActivity(ctx, request, 'Marketplace Listing Review', `Status: ${status} | Listing ID: ${listing_id}`);
    
            return new Response(JSON.stringify({ success: true, message: `Listing ${status}` }), { status: 200 });
    
        } catch (error: any) {
            console.error('Approve listing error:', error);
            return new Response(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), { status: 500 });
        }
  });
};
