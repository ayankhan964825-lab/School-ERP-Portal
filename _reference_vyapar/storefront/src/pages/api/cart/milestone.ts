import type { APIRoute } from 'astro';
import { getActiveMilestone } from '../../../lib/database';
import { storeContext } from '../../../lib/storeContext';

export const GET: APIRoute = async ({ locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const milestone = await getActiveMilestone();
      
      if (!milestone) {
        return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
  
      return new Response(JSON.stringify(milestone), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch milestone' }), { status: 500 });
    }
  });
};
