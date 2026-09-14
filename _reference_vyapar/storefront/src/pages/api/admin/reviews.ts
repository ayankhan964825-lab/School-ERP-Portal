import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { updateReview } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'reviews') && !canManageSection(ctx, 'store_front')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        const { action, id } = body;
    
        if (!id) return new Response(JSON.stringify({ error: 'Review ID is required' }), { status: 400 });
    
        if (action === 'approve') {
          const updated = await updateReview(id, { status: 'approved' });
          if (!updated) return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
          return new Response(JSON.stringify({ success: true, review: updated }), { status: 200 });
        }
    
        if (action === 'reject') {
          const updated = await updateReview(id, { status: 'rejected' });
          if (!updated) return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
          return new Response(JSON.stringify({ success: true, review: updated }), { status: 200 });
        }
    
        if (action === 'feature') {
          const updated = await updateReview(id, { status: 'approved', is_featured: true });
          if (!updated) return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
          return new Response(JSON.stringify({ success: true, review: updated }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error) {
        console.error('Reviews API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
