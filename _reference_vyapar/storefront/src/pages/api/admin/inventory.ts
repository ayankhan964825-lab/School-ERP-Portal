import type { APIRoute } from 'astro';
import { getProducts, updateProductVariants, updateProductB2BVariants, getSettings, saveSettings, supabaseAdmin, clearCached } from '../../../lib/database';
import { getPermissionContext } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    console.log('inventory.ts hit!');
    const ctx = getPermissionContext(cookies);
    const canManage = ctx.adminRole === 'super_admin' || ctx.permissions['products'] === 'manage';
    if (!canManage) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
      }
    try {
        const body = await request.json();
        const { global_inventory_tracking, bulk_order_inventory_tracking, stock_updates, location_id } = body;
    
        // 1. Save global settings
        const currentSettings = await getSettings();
        const newSettings = {
          global_inventory_tracking,
          bulk_order_inventory_tracking
        };
        await saveSettings(newSettings);
    
        // 2. Process stock updates
        if (stock_updates && Array.isArray(stock_updates)) {
          if (location_id && supabaseAdmin) {
            // Filter out phantom variants (e.g. 'v1') before processing to prevent UUID syntax errors
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const validStockUpdates = stock_updates.filter((u: any) => u.variant_id && uuidRegex.test(u.variant_id));

            // Update location specific inventory
            const upserts = validStockUpdates.map((u: any) => ({
              store_id: locals.storeId,
              location_id,
              variant_id: u.variant_id,
              available: Math.max(0, Number(u.stock) || 0),
              updated_at: new Date().toISOString()
            }));
            
            if (upserts.length > 0) {
              const { error } = await supabaseAdmin.from('inventory_levels').upsert(upserts, { onConflict: 'variant_id,location_id' });
              if (error) throw error;
              
              // Aggregate global stock across all locations for the updated variants
              const variantIds = validStockUpdates.map((u: any) => u.variant_id).filter((id: any) => id && id !== 'undefined');
              const b2bIds = new Set(validStockUpdates.filter((u: any) => u.is_b2b === true).map((u: any) => u.variant_id));
              
              if (variantIds.length > 0) {
                 const { data: allStock } = await supabaseAdmin.from('inventory_levels').select('variant_id, available').in('variant_id', variantIds).eq('store_id', locals.storeId);
                 if (allStock) {
                    const aggregated: Record<string, number> = {};
                    for (const row of allStock) {
                       aggregated[row.variant_id] = (aggregated[row.variant_id] || 0) + (row.available || 0);
                    }
                    for (const vid of Object.keys(aggregated)) {
                       if (b2bIds.has(vid)) {
                           await supabaseAdmin.from('product_b2b_variants').update({ stock: aggregated[vid] }).eq('id', vid).eq('store_id', locals.storeId);
                       } else {
                           await supabaseAdmin.from('product_variants').update({ stock: aggregated[vid] }).eq('id', vid).eq('store_id', locals.storeId);
                       }
                    }
                 }
              }
            }
          } else {
            // Global stock updates (Atomic using direct update instead of JSON rewriting)
            if (supabaseAdmin) {
               // Fetch default location once
               const { data: defaultLoc } = await supabaseAdmin.from('locations').select('id').eq('store_id', locals.storeId).eq('is_default', true).maybeSingle();
               
               const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
               for (const u of stock_updates) {
                 if (u.variant_id && uuidRegex.test(u.variant_id)) {
                   const newStock = Math.max(0, Number(u.stock) || 0);
                   
                   // Atomically update product_variants or product_b2b_variants
                   const targetTable = u.is_b2b ? 'product_b2b_variants' : 'product_variants';
                   await supabaseAdmin.from(targetTable)
                     .update({ stock: newStock })
                     .eq('id', u.variant_id)
                     .eq('store_id', locals.storeId);
                   
                   // Sync to default location inventory_levels if it exists
                   if (defaultLoc?.id) {
                     await supabaseAdmin.from('inventory_levels').upsert({
                          store_id: locals.storeId,
                          location_id: defaultLoc.id,
                          variant_id: u.variant_id,
                          available: newStock,
                          updated_at: new Date().toISOString()
                     }, { onConflict: 'variant_id,location_id' });
                   }
                 }
               }
            }
          }
        }
        clearCached(`products_${locals.storeId}`);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    
      } catch (err: any) {
        console.error('Error saving inventory:', err);
        return new Response(JSON.stringify({ error: err.message || 'Server error', details: err }), { status: 500 });
      }
  });
};
