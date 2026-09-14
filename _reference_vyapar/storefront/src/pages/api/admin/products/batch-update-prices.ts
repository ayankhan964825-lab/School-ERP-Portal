import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase, isSupabase } from '../../../../lib/database';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { updates } = body; // Array of { id, specifications, variants }

    if (!Array.isArray(updates) || updates.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No updates provided' }), { status: 400 });
    }

    
    
    if (isSupabase && supabase) {
      await Promise.all(updates.map(async (update: any) => {
        const { data: currData, error: fetchErr } = await supabase
          .from('products')
          .select('variants, specifications')
          .eq('id', update.id)
          .single();
          
        if (fetchErr || !currData) return;
        
        let newSpecs = currData.specifications || {};
        let newVariants = currData.variants || [];
        
        if (update.specifications) {
           if (update.specifications._pos_price !== undefined && update.specifications._pos_price !== '') {
               newSpecs._pos_price = parseFloat(update.specifications._pos_price);
           } else {
               delete newSpecs._pos_price;
           }
           if (update.specifications._b2b_price !== undefined && update.specifications._b2b_price !== '') {
               newSpecs._b2b_price = parseFloat(update.specifications._b2b_price);
           } else {
               delete newSpecs._b2b_price;
           }
        }
        
        if (Array.isArray(update.variants)) {
           update.variants.forEach((vUpdate: any) => {
              if (newVariants[vUpdate.vIndex]) {
                 if (vUpdate.pos_price !== undefined && vUpdate.pos_price !== '') {
                     newVariants[vUpdate.vIndex].pos_price = parseFloat(vUpdate.pos_price);
                 } else {
                     delete newVariants[vUpdate.vIndex].pos_price;
                 }
                 
                 if (vUpdate.b2b_price !== undefined && vUpdate.b2b_price !== '') {
                     newVariants[vUpdate.vIndex].b2b_price = parseFloat(vUpdate.b2b_price);
                 } else {
                     delete newVariants[vUpdate.vIndex].b2b_price;
                 }
              }
           });
        }
        
        await supabase
          .from('products')
          .update({
            specifications: newSpecs,
            variants: newVariants,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
          
        // Sync b2b_price to product_variants table
        if (Array.isArray(update.variants)) {
           await Promise.all(update.variants.map(async (vUpdate: any) => {
              const variant = newVariants[vUpdate.vIndex];
              if (variant && variant.id) {
                 await supabase
                   .from('product_variants')
                   .update({ b2b_price: variant.b2b_price || null })
                   .eq('id', variant.id);
              }
           }));
        }
      }));
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
