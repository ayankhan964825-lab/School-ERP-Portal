import type { APIRoute } from 'astro';
import { supabaseAdmin as supabase, isSupabase } from '../../../../lib/database';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { product_id, b2b_variant } = body;

    if (!product_id || !b2b_variant || !b2b_variant.name || !b2b_variant.price) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid parameters' }), { status: 400 });
    }

    
    
    if (isSupabase && supabase) {
      const { data: currData, error: fetchErr } = await supabase
        .from('products')
        .select('b2b_variants')
        .eq('id', product_id)
        .single();
        
      if (fetchErr || !currData) {
         throw new Error('Product not found');
      }
      
      let newB2bVariants = currData.b2b_variants || [];
      // Generate a simple ID
      const newVar = {
         id: 'b2b_' + Date.now(),
         weight: b2b_variant.name,
         price: parseFloat(b2b_variant.price),
         mrp: parseFloat(b2b_variant.price),
         stock: 0
      };
      
      newB2bVariants.push(newVar);
      
      await supabase
        .from('products')
        .update({
          b2b_variants: newB2bVariants,
          updated_at: new Date().toISOString()
        })
        .eq('id', product_id);
        
      return new Response(JSON.stringify({ success: true, variant: newVar }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
