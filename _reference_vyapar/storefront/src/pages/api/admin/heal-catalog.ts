import type { APIRoute } from 'astro';
import { supabaseAdmin, getProducts, updateProductVariants, updateProductB2BVariants } from '../../../lib/database';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const storeId = locals.storeId || '00000000-0000-0000-0000-000000000002';
    const { data: products } = await supabaseAdmin.from('products').select('*').eq('store_id', storeId);
    
    if (!products) return new Response('No products');
    
    let healed = 0;
    for (const p of products) {
       let needsHeal = false;
       if (p.variants && Array.isArray(p.variants)) {
         p.variants.forEach((v: any) => {
           if (!v.id || !v.id.includes('-')) {
             v.id = crypto.randomUUID();
             needsHeal = true;
           }
         });
         if (needsHeal) {
           await updateProductVariants(p.id, p.variants, storeId);
           await supabaseAdmin.from('products').update({ variants: p.variants }).eq('id', p.id);
           healed++;
         }
       }
    }
    return new Response(JSON.stringify({ healed, total: products.length }));
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
