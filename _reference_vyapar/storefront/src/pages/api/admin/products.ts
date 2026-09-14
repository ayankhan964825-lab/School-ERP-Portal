import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase, isSupabase, logActivity, updateProductVariants, updateProductB2BVariants, clearCached } from '../../../lib/database';
import { getPermissionContext } from '../../../lib/permissions';
import * as mockDb from '../../../lib/mockDb';
import { storeContext } from "../../../lib/storeContext";
import { validatePayload } from '../../../lib/validator';
import { z } from 'zod';

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  weight: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  mrp: z.coerce.number().min(0).optional(),
  originalPrice: z.coerce.number().min(0).optional(),
  original_price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  sku: z.string().optional(),
  is_out_of_stock: z.boolean().optional(),
  is_hidden: z.boolean().optional()
}).passthrough();

const productPayloadSchema = z.object({
  action: z.enum(['create', 'update', 'update_variant', 'delete']),
  id: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  long_description: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  original_price: z.coerce.number().min(0).optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  bullet_points: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  custom_inputs: z.array(z.any()).optional(),
  is_digital: z.boolean().optional(),
  digital_delivery_url: z.string().nullable().optional(),
  variant_options: z.array(z.any()).optional(),
  variants: z.array(variantSchema).optional(),
  b2b_variants: z.array(variantSchema).optional(),
  video_url: z.string().nullable().optional(),
  rating_value: z.coerce.number().min(0).max(5).optional(),
  rating_count: z.coerce.number().min(0).optional(),
  is_in_stock: z.boolean().optional(),
  is_active: z.boolean().optional(),
  track_inventory: z.boolean().optional(),
  hsn_code: z.string().nullable().optional(),
  gst_rate: z.coerce.number().min(0).nullable().optional(),
  variantId: z.string().optional(),
  updates: z.record(z.string(), z.any()).optional()
}).passthrough();

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        // Validate Payload Structure Securely
        const validation = await validatePayload(request, productPayloadSchema);
        if (!validation.success) return validation.errorResponse!;
        
        const body = validation.data!;
        const { action, id, ...fields } = body;
    
        const ctx = getPermissionContext(cookies);
        const callerId = ctx.adminId;
        const callerName = ctx.adminName;
        const canManage = ctx.adminRole === 'super_admin' || ctx.permissions['products'] === 'manage';
    
        if (!canManage) {
          return new Response(JSON.stringify({ error: 'Forbidden', success: false }), { status: 403 });
        }
    
        const sanitizeSlug = (raw: string) =>
          raw.toLowerCase().trim()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-')
            .slice(0, 100);

        const buildProduct = (data: any, existingId?: string) => ({
          id: existingId || 'PROD-' + Date.now(),
          name: data.name,
          // Enforce URL-safe slug regardless of whether client provided one
          slug: sanitizeSlug(data.slug || data.name || 'product'),
          category: data.category || 'uncategorized',
          description: data.description || '',
          long_description: data.long_description || '',
          price: data.price || (data.variants?.[0]?.price ?? 0),
          original_price: data.original_price || (data.variants?.[0]?.mrp ?? 0),
          image: data.image || `/products/${data.slug || ''}.webp`,
          images: data.images || [],
          bullet_points: data.bullet_points || [],
          badges: data.badges || [],
          specifications: { ...(data.specifications || {}), _track_inventory: data.track_inventory === true },
          custom_inputs: data.custom_inputs || [],
          is_digital: data.is_digital === true,
          digital_delivery_url: data.digital_delivery_url || null,
          is_q_commerce_only: data.is_digital === true ? false : data.is_q_commerce_only === true,
          is_standard_only: data.is_digital === true ? false : data.is_standard_only === true,
          variant_options: data.variant_options || [],
          variants: data.variants || [],
          video_url: data.video_url || null,
          rating: data.rating_value || 0,
          reviews_count: data.rating_count || 0,
          is_in_stock: data.is_in_stock !== false,
          is_active: data.is_active !== false,
          hsn_code: data.hsn_code || null,
          gst_rate: data.gst_rate !== undefined && data.gst_rate !== null ? parseFloat(data.gst_rate) : null,
          updated_at: new Date().toISOString(),
          store_id: locals.storeId,
        });
    
        // ── CREATE ─────────────────────────────────────────────
        if (action === 'create') {
          if (!fields.name) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
          const product = buildProduct(fields);
          
          if (isSupabase && supabase) {
            try {
              const { data, error } = await supabase.from(TABLES.PRODUCTS).insert(product).select().single();
              if (error) {
                if (error.code === '23505') {
                  return new Response(JSON.stringify({ error: 'A product with this slug/URL already exists. Please choose a different one.' }), { status: 409 });
                }
                throw error;
              }
              
              if (product.variants && product.variants.length > 0) {
                await updateProductVariants(data.id, product.variants);
            }
            if (fields.b2b_variants && fields.b2b_variants.length > 0) {
                await updateProductB2BVariants(data.id, fields.b2b_variants);
            }
            
            if ((product.variants && product.variants.length > 0) || (fields.b2b_variants && fields.b2b_variants.length > 0)) {
                const refetch = await supabase.from(TABLES.PRODUCTS).select().eq('id', data.id).single();
                if (refetch.data) Object.assign(data, refetch.data);
            }
    
            try { await logActivity(callerId, callerName, 'Created Product', data.id, { name: data.name }, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
            clearCached(`products_${locals.storeId}`);
            clearCached(`storefront_products_${locals.storeId}`);
            return new Response(JSON.stringify({ success: true, product: data }), { status: 200 });
            } catch(e) { throw e; }
          }
          return new Response(JSON.stringify({ success: true, product }), { status: 200 });
        }
    
        // ── UPDATE ─────────────────────────────────────────────
        if (action === 'update') {
          if (!id && !fields.slug) return new Response(JSON.stringify({ error: 'ID or slug is required' }), { status: 400 });
    
          if (isSupabase && supabase) {
            // Partial update support (e.g. just category change from quick-select)
            const partialFields = Object.fromEntries(
              Object.entries(fields).filter(([k, v]) => v !== undefined && v !== null && k !== 'action')
            );
            
            let b2bVariantsToSync: any[] | undefined;
            
            // Fix JSONB overwrite bug: fetch current product specifications first
            if ('track_inventory' in partialFields || 'specifications' in partialFields) {
              let currentProductQuery = supabase.from(TABLES.PRODUCTS).select('specifications');
              if (id) currentProductQuery = currentProductQuery.eq('id', id);
              else currentProductQuery = currentProductQuery.eq('slug', fields.slug);
              
              const { data: currentProduct } = await currentProductQuery.single();
              const existingSpecs = currentProduct?.specifications || {};
              
              const newSpecs = partialFields.specifications || existingSpecs;
              const newTrackInventory = 'track_inventory' in partialFields ? partialFields.track_inventory : existingSpecs._track_inventory;
              
              partialFields.specifications = { ...newSpecs, _track_inventory: newTrackInventory };
              delete partialFields.track_inventory;
            }
            if ('b2b_variants' in partialFields) {
              b2bVariantsToSync = partialFields.b2b_variants as any[];
              delete partialFields.b2b_variants;
            }
            
            // Map frontend rating fields to database columns
            if ('rating_value' in partialFields) {
              partialFields.rating = partialFields.rating_value;
              delete partialFields.rating_value;
            }
            if ('rating_count' in partialFields) {
              partialFields.reviews_count = partialFields.rating_count;
              delete partialFields.rating_count;
            }
            
            partialFields.updated_at = new Date().toISOString();
    
            let query = supabase.from(TABLES.PRODUCTS).update(partialFields).eq('store_id', locals.storeId);
            if (id)          query = query.eq('id', id);
            else if (fields.slug) query = query.eq('slug', fields.slug);
    
            let data, error;
            try {
              const res = await query.select().single();
              data = res.data;
              error = res.error;
              if (error) {
                if (error.code === '23505') {
                  return new Response(JSON.stringify({ error: 'A product with this slug/URL already exists. Please choose a different one.' }), { status: 409 });
                }
                throw error;
              }
            } catch(e) { throw e; }
    
            // If variants or b2b_variants were passed in the update, sync them
            if (partialFields.variants) {
               await updateProductVariants(data.id, partialFields.variants as any[]);
            }
            if (b2bVariantsToSync) {
               await updateProductB2BVariants(data.id, b2bVariantsToSync);
            }
            
            if (partialFields.variants || b2bVariantsToSync) {
               const refetch = await supabase.from(TABLES.PRODUCTS).select().eq('id', data.id).single();
               if (refetch.data) data = refetch.data;
            }
    
            try { await logActivity(callerId, callerName, 'Updated Product', data.id, { updated_fields: Object.keys(partialFields) }, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
            clearCached(`products_${locals.storeId}`);
            clearCached(`storefront_products_${locals.storeId}`);
            return new Response(JSON.stringify({ success: true, product: data }), { status: 200 });
          }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        // ── UPDATE VARIANT ───────────────────────────────────────
        if (action === 'update_variant') {
          if (!id && !fields.slug) return new Response(JSON.stringify({ error: 'ID or slug is required' }), { status: 400 });
          if (!fields.variantId) return new Response(JSON.stringify({ error: 'variantId is required' }), { status: 400 });
    
          if (isSupabase && supabase) {
            let query = supabase.from(TABLES.PRODUCTS).select('id, variants').eq('store_id', locals.storeId);
            if (id) query = query.eq('id', id);
            else query = query.eq('slug', fields.slug);
            
            const { data: prodData, error: prodErr } = await query.single();
            if (prodErr || !prodData) throw prodErr;
    
            // Check if variantId is a valid UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fields.variantId);
            
            let variantUpdated = false;

            if (isUUID) {
              // Update the variant in the normalized table
              const { error: varErr } = await supabase.from(TABLES.PRODUCT_VARIANTS)
                .update(fields.updates)
                .eq('id', fields.variantId)
                .eq('product_id', prodData.id); // Secure: ensure it belongs to this product
              if (varErr) throw varErr;
              variantUpdated = true;
            }

            // Update the legacy JSONB array directly
            let currentVariants = Array.isArray(prodData.variants) ? [...prodData.variants] : [];
            
            const updatedVariants = currentVariants.map(v => {
              if (v.id === fields.variantId) {
                variantUpdated = true;
                return { ...v, ...fields.updates };
              }
              return v;
            });
            
            if (variantUpdated) {
              const { error: updErr } = await supabase.from(TABLES.PRODUCTS).update({ variants: updatedVariants }).eq('id', prodData.id).eq('store_id', locals.storeId);
              if (updErr) throw updErr;
            }
            
            try { await logActivity(callerId, callerName, 'Updated Product Variant', prodData.id, { variant_id: fields.variantId }, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
            clearCached(`products_${locals.storeId}`);
            clearCached(`storefront_products_${locals.storeId}`);
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        // ── DELETE ─────────────────────────────────────────────
        if (action === 'delete') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          
          if (isSupabase && supabase) {
            const { error } = await supabase.from(TABLES.PRODUCTS).delete().eq('id', id).eq('store_id', locals.storeId);
            if (error) throw error;
            try { await logActivity(callerId, callerName, 'Deleted Product', id, {}, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
            clearCached(`products_${locals.storeId}`);
            clearCached(`storefront_products_${locals.storeId}`);
          }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    
      } catch (error: any) {
        console.error('Products API error:', error);
        
        // Extract actual error message from Supabase or native errors
        const errorMsg = error?.message || error?.details || JSON.stringify(error) || 'Unknown error';
        
        return new Response(JSON.stringify({ 
          error: errorMsg,
          code: error?.code,
          hint: error?.hint 
        }), { status: 500 });
      }
  });
};

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const id = url.searchParams.get('id');
    
    if (isSupabase && supabase) {
      if (id) {
        const { data, error } = await supabase.from(TABLES.PRODUCTS).select('*').eq('id', id).eq('store_id', locals.storeId).single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { status: 200 });
      }
      const { data, error } = await supabase.from(TABLES.PRODUCTS).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data || []), { status: 200 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
};
