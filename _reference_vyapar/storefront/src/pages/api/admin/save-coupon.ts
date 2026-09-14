import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { saveCoupon, updateCoupon, logActivity } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'marketing')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const formData = await request.formData();
        const couponId = formData.get('coupon_id')?.toString() || '';
        
        const parseSafeNumber = (val: any) => {
          const n = Number(val);
          return isNaN(n) ? 0 : n;
        };
    
        const coupon = {
          code: formData.get('code')?.toString().toUpperCase() || '',
          discount_type: formData.get('discount_type')?.toString() || 'percentage',
          discount_value: parseSafeNumber(formData.get('discount_value')),
          min_order_amount: parseSafeNumber(formData.get('min_order_amount')),
          max_discount_amount: parseSafeNumber(formData.get('max_discount_amount')),
          usage_limit: parseSafeNumber(formData.get('usage_limit')),
          valid_from: formData.get('valid_from')?.toString() || null,
          valid_until: formData.get('valid_until')?.toString() || null,
          first_order_only: formData.get('first_order_only') === 'on',
          one_time_per_user: formData.get('one_time_per_user') === 'on',
          is_public: formData.get('is_public') === 'on',
          is_stackable: formData.get('is_stackable') === 'on',
        } as any;
    
        if (ctx.storeId !== 'SUPER_ADMIN_BYPASS') {
          coupon.store_id = ctx.storeId;
        }
    
        console.log('[SaveCoupon] Action:', couponId ? 'UPDATE' : 'CREATE');
        console.log('[SaveCoupon] ID:', couponId);
        console.log('[SaveCoupon] Data:', coupon);
    
        if (coupon.discount_value < 0 || coupon.min_order_amount < 0 || coupon.max_discount_amount < 0 || coupon.usage_limit < 0) {
            return new Response(JSON.stringify({ error: 'Values cannot be negative.' }), { status: 400 });
        }
        if (!coupon.code || coupon.code.trim() === '') {
            return new Response(JSON.stringify({ error: 'Coupon code cannot be empty.' }), { status: 400 });
        }
        if (coupon.discount_type !== 'percentage' && coupon.discount_type !== 'fixed') {
            return new Response(JSON.stringify({ error: 'Invalid discount type.' }), { status: 400 });
        }
        if (coupon.discount_type === 'percentage' && coupon.discount_value > 100) {
            return new Response(JSON.stringify({ error: 'Percentage discount cannot exceed 100%.' }), { status: 400 });
        }
        if (coupon.valid_from && coupon.valid_until && new Date(coupon.valid_from) > new Date(coupon.valid_until)) {
            return new Response(JSON.stringify({ error: 'Valid from date must be before valid until date.' }), { status: 400 });
        }

        if (couponId) {
          await updateCoupon(couponId, coupon);
        } else {
          await saveCoupon(coupon);
        }
        
        // Log activity
        const callerId = cookies.get('admin_id')?.value || '';
        const callerName = cookies.get('admin_name')?.value || 'System';
        try { await logActivity(callerId, callerName, couponId ? 'Updated Coupon' : 'Created Coupon', coupon.code, { discount: coupon.discount_value }, request); } catch (e) {}
    
        if (request.headers.get('accept')?.includes('application/json')) {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return Response.redirect(new URL('/admin/coupons?success=true', request.url));
      } catch (error: any) {
        console.error('[SaveCoupon] Failed to save coupon:', error?.message || error);
        if (request.headers.get('accept')?.includes('application/json')) {
            return new Response(JSON.stringify({ error: error?.message || 'Failed to save coupon' }), { status: 500 });
        }
        return Response.redirect(new URL('/admin/coupons?error=true', request.url));
      }
  });
};
