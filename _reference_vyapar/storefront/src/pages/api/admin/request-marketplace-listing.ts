import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'products')) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden: You do not have permission to manage products.' }), { status: 403 });
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
        const { product_id } = body;
    
        if (!product_id) {
          return new Response(JSON.stringify({ success: false, error: "Product ID is required" }), { status: 400 });
        }
    
        // Verify product belongs to store
        const { data: product, error: prodErr } = await supabaseAdmin
          .from(TABLES.PRODUCTS)
          .select('id')
          .eq('id', product_id)
          .eq('store_id', storeId)
          .single();
    
        if (prodErr || !product) {
          return new Response(JSON.stringify({ success: false, error: "Product not found or unauthorized" }), { status: 404 });
        }
    
        // Check if already requested or listed
        const { data: existing, error: checkErr } = await supabaseAdmin
          .from(TABLES.MARKETPLACE_LISTINGS)
          .select('status')
          .eq('store_id', storeId)
          .eq('product_id', product_id)
          .maybeSingle();
    
        if (existing) {
            if (existing.status === 'pending_review') {
                return new Response(JSON.stringify({ success: false, error: "This product is already pending review." }), { status: 400 });
            } else if (existing.status === 'approved') {
                return new Response(JSON.stringify({ success: false, error: "This product is already approved and listed on the marketplace." }), { status: 400 });
            }
            // If rejected, allow re-submitting by updating status
            const { error: updateErr } = await supabaseAdmin
                .from(TABLES.MARKETPLACE_LISTINGS)
                .update({ status: 'pending_review', updated_at: new Date().toISOString() })
                .eq('store_id', storeId)
                .eq('product_id', product_id);
                
            if (updateErr) throw updateErr;
        } else {
            // Insert new request
            const { error: insertErr } = await supabaseAdmin
                .from(TABLES.MARKETPLACE_LISTINGS)
                .insert({
                    store_id: storeId,
                    product_id: product_id,
                    status: 'pending_review',
                    is_active: false
                });
    
            if (insertErr) {
                console.error(insertErr);
                throw new Error("Failed to submit request.");
            }
        }
    
        return new Response(JSON.stringify({ success: true, message: "Submitted for review" }), { status: 200 });
    
      } catch (error: any) {
        console.error('Marketplace request error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), { status: 500 });
      }
  });
};
