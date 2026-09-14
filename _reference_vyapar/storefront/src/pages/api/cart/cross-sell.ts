import type { APIRoute } from 'astro';
import { getCrossSellProducts } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        let excludeSlugs: string[] = [];
        try {
          const body = await request.json();
          excludeSlugs = body.cartItems ? body.cartItems.map((item: any) => {
            const uuidMatch = item.id.match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
            return item.slug || (uuidMatch ? uuidMatch[1] : item.id.split('-')[0]);
          }) : [];
        } catch (e: any) {
          if (e.message && e.message.includes('Unexpected')) {
            console.warn('[cross-sell] Failed to parse request body:', e.message);
          }
          // Body might be empty or invalid, fallback to empty array
        }
        
        const products = await getCrossSellProducts(excludeSlugs);
        
        return new Response(JSON.stringify(products), { 
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch cross-sell products' }), { status: 500 });
      }
  });
};
