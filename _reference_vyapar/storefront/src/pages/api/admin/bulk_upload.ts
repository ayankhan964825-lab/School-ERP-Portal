import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase, updateProductVariants, clearCached } from '../../../lib/database';
import crypto from 'node:crypto';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'products')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        
        if (!Array.isArray(body)) {
          return new Response(JSON.stringify({ error: 'Payload must be an array of products' }), { status: 400 });
        }
    
        if (isSupabase && supabaseAdmin) {
          // Very basic bulk insert for products
          // In a real app we'd map this carefully and handle variants/categories
          const productsToInsert = body.map((p, index) => {
            // Ensure slug uniqueness for bulk uploads across existing products
            const baseSlug = p.slug || p.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const finalSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
            
            return {
              id: 'PROD-' + Date.now() + crypto.randomBytes(3).toString('hex'),
              store_id: ctx.storeId,
              name: p.name,
              slug: finalSlug,
              category: (p.category || 'uncategorized').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
              description: p.description || '',
              long_description: p.long_description || '',
              price: Math.max(0, Number(p.price) || Number(p.variants?.[0]?.price) || 0),
              original_price: Math.max(0, Number(p.original_price) || Number(p.variants?.[0]?.mrp) || 0),
              image: p.image || `/products/${finalSlug}.webp`,
              images: p.images || [],
              bullet_points: p.bullet_points || [],
              badges: p.badges || [],
              specifications: { ...(p.specifications || {}), _track_inventory: p.track_inventory === true },
              custom_inputs: p.custom_inputs || [],
              is_digital: p.is_digital === true || p.is_digital === 'TRUE',
              digital_delivery_url: p.digital_delivery_url || null,
              is_q_commerce_only: (p.is_digital === true || p.is_digital === 'TRUE') ? false : (p.is_q_commerce_only === true || p.is_q_commerce_only === 'TRUE'),
              variant_options: p.variant_options || [],
              variants: p.variants || [],
              video_url: p.video_url || null,
              rating: p.rating_value || p.rating || 0,
              reviews_count: p.rating_count || p.reviews_count || 0,
              is_in_stock: p.is_in_stock !== false,
              is_active: p.is_active !== false,
              hsn_code: p.hsn_code || null,
              gst_rate: p.gst_rate !== undefined && p.gst_rate !== null ? parseFloat(p.gst_rate) : null,
              updated_at: new Date().toISOString()
            };
          });
    
          const { data, error } = await supabaseAdmin.from(TABLES.PRODUCTS).insert(productsToInsert).select();
          if (error) {
            console.error('Supabase Bulk Insert Error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
          }
          
          // Get default location
          const { data: locData } = await supabaseAdmin.from('locations').select('id').eq('store_id', ctx.storeId).eq('is_default', true).single();
          const defaultLocationId = locData?.id;

          
          if (data && data.length > 0) {
            for (const insertedProduct of data) {
              const matchedProduct = productsToInsert.find(p => p.id === insertedProduct.id);
              // Original matched payload from 'body'
              const originalPayload = body.find((p: any) => p.name === insertedProduct.name && p.slug === insertedProduct.slug);
              
              if (originalPayload) {
                if (originalPayload.variants && originalPayload.variants.length > 0) {
                  try {
                    await updateProductVariants(insertedProduct.id, originalPayload.variants);
                  } catch (varErr) {
                    console.error('Failed to sync variants for bulk inserted product:', insertedProduct.id, varErr);
                  }
                }
                if (originalPayload.b2b_variants && originalPayload.b2b_variants.length > 0) {
                  try {
                    // Requires updateProductB2BVariants
                    const { updateProductB2BVariants } = await import('../../../lib/database');
                    await updateProductB2BVariants(insertedProduct.id, originalPayload.b2b_variants);
                  } catch (varErr) {
                    console.error('Failed to sync B2B variants for bulk inserted product:', insertedProduct.id, varErr);
                  }
                }
              }
            }
            
            // Sync inventory_levels for all newly created variants to the default location
            if (defaultLocationId) {
              const productIds = data.map(p => p.id);
              const { data: newVariants } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).select('id, stock').in('product_id', productIds);
              if (newVariants && newVariants.length > 0) {
                const inventoryLevels = newVariants.map((v: any) => ({
                  variant_id: v.id,
                  location_id: defaultLocationId,
                  store_id: ctx.storeId,
                  available: v.stock || 0,
                  committed: 0
                }));
                const { error: invError } = await supabaseAdmin.from('inventory_levels').upsert(inventoryLevels, { onConflict: 'variant_id,location_id' });
                if (invError) console.error('Failed to sync bulk upload inventory_levels:', invError);
              }
            }
          }
    
          clearCached(`products_${locals.storeId}`);

          return new Response(JSON.stringify({ success: true, count: productsToInsert.length }), { status: 200 });
        } else {
          // Mock mode
          return new Response(JSON.stringify({ success: true, count: body.length }), { status: 200 });
        }
      } catch (error) {
        console.error('Bulk upload error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
