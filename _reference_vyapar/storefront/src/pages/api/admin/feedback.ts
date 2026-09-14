import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { updateFeedback, updateBulkInquiry } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'feedback') && !canManageSection(ctx, 'store_front')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        const { action, id } = body;
    
        if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
    
        if (action === 'resolve_feedback') {
          const updated = await updateFeedback(id, { status: 'resolved' });
          if (!updated) return new Response(JSON.stringify({ error: 'Feedback not found' }), { status: 404 });
          return new Response(JSON.stringify({ success: true, feedback: updated }), { status: 200 });
        }
    
        if (action === 'mark_contacted') {
          const updated = await updateBulkInquiry(id, { status: 'contacted' });
          if (!updated) return new Response(JSON.stringify({ error: 'Inquiry not found' }), { status: 404 });
          return new Response(JSON.stringify({ success: true, inquiry: updated }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error) {
        console.error('Feedback API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
