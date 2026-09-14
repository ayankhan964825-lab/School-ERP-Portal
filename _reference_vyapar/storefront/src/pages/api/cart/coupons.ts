import type { APIRoute } from 'astro';
import { getCoupons } from '../../../lib/database';
import { storeContext } from '../../../lib/storeContext';

export const GET: APIRoute = async ({ locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const coupons = await getCoupons();
      const activeCoupons = coupons.filter((c: any) => c.is_active && c.is_public !== false);
  
      return new Response(JSON.stringify(activeCoupons), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch coupons' }), { status: 500 });
    }
  });
};
