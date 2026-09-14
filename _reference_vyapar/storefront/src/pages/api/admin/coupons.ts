import type { APIRoute } from 'astro';
import { updateCoupon, deleteCoupon, logActivity } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'marketing')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    const callerId = ctx.adminId;
    const callerName = ctx.adminName;
    try {
        const body = await request.json();
    
        const { action, id, ...data } = body;
    
        if (action === 'toggle_active') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          const updated = await updateCoupon(id, { is_active: data.is_active });
          if (!updated) return new Response(JSON.stringify({ error: 'Coupon not found' }), { status: 404 });
          try { await logActivity(callerId, callerName, 'Updated Coupon Status', id, { active: data.is_active }, request); } catch(e) {}
          return new Response(JSON.stringify({ success: true, coupon: updated }), { status: 200 });
        }
    
        if (action === 'delete') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          await deleteCoupon(id);
          try { await logActivity(callerId, callerName, 'Deleted Coupon', id, {}, request); } catch(e) {}
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'update') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          const updated = await updateCoupon(id, data);
          if (!updated) return new Response(JSON.stringify({ error: 'Coupon not found' }), { status: 404 });
          try { await logActivity(callerId, callerName, 'Updated Coupon Status', id, { active: data.is_active }, request); } catch(e) {}
          return new Response(JSON.stringify({ success: true, coupon: updated }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error) {
        console.error('Coupons API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
