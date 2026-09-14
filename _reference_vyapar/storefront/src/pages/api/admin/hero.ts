import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { saveHeroSlide, updateHeroSlide, deleteHeroSlide } from '../../../lib/database';
import { storeContext, getTenantId } from '../../../lib/storeContext';

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'hero') && !canManageSection(ctx, 'store_front')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        const { action, id, ...data } = body;
    
        let activeStoreId = ctx.storeId;
        if (!activeStoreId || activeStoreId === 'SUPER_ADMIN_BYPASS') {
          activeStoreId = getTenantId();
        }
    
        if (action === 'create_slide') {
          data.store_id = activeStoreId;
          const slide = await saveHeroSlide(data);
          return new Response(JSON.stringify({ success: true, slide }), { status: 200 });
        }
    
        if (action === 'update_slide') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          const updated = await updateHeroSlide(id, data, ctx.storeId);
          if (!updated) return new Response(JSON.stringify({ error: 'Slide not found' }), { status: 404 });
          return new Response(JSON.stringify({ success: true, slide: updated }), { status: 200 });
        }
    
        if (action === 'delete_slide') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          await deleteHeroSlide(id, ctx.storeId);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'reorder_slides') {
          // data.order is an array of { id, sort_order }
          if (!Array.isArray(data.order)) return new Response(JSON.stringify({ error: 'Invalid order data' }), { status: 400 });
          
          const promises = data.order.map((item: { id: string, sort_order: number }) => 
            updateHeroSlide(item.id, { sort_order: item.sort_order }, ctx.storeId)
          );
          
          await Promise.all(promises);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error: any) {
        console.error('Hero API error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
      }
  });
};
