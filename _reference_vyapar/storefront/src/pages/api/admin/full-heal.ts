import type { APIRoute } from 'astro';
import { supabaseAdmin, updateProductVariants, updateProductB2BVariants } from '../../../lib/database';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const storeId = locals.storeId || '00000000-0000-0000-0000-000000000002';
    const { data: products } = await supabaseAdmin.from('products').select('*').eq('store_id', storeId);
    
    if (!products) return new Response('No products');
    
    let healed = 0;
    for (const p of products) {
       if (p.variants && Array.isArray(p.variants)) {
         // Generate valid UUIDs for any remaining phantom variants
         p.variants.forEach((v: any) => {
           if (!v.id || !v.id.includes('-')) {
             v.id = crypto.randomUUID();
           }
         });
         await updateProductVariants(p.id, p.variants, storeId);
       }
       if (p.b2b_variants && Array.isArray(p.b2b_variants)) {
         p.b2b_variants.forEach((v: any) => {
           if (!v.id || !v.id.includes('-')) {
             v.id = crypto.randomUUID();
           }
         });
         await updateProductB2BVariants(p.id, p.b2b_variants, storeId);
       }
       healed++;
    }
    
    // Clear cache
    const { clearCached } = await import('../../../lib/database');
    clearCached('products_' + storeId);
    
    return new Response(JSON.stringify({ healed_relational_tables: healed }));
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
