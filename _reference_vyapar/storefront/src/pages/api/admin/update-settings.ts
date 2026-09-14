import { getPermissionContext, canManageSection, hashPassword } from '../../../lib/permissions';
import { getStaff, getSettings, saveSettings } from '../../../lib/database';
import type { APIRoute } from 'astro';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'settings')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    const contentType = request.headers.get('content-type') || '';
    try {
        let updates: Record<string, any> = {};
    
        // Support both JSON (fetch) and FormData (native form fallback)
        if (contentType.includes('application/json')) {
          updates = await request.json();
        } else {
          const formData = await request.formData();
          for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
              updates[key] = value;
            }
          }
        }
    
    
        // Ensure boolean checkboxes are saved correctly
        delete updates.admin_auth_code;
        if (!updates.action) {
          const booleanKeys = ['cod_enabled', 'razorpay_enabled', 'phonepe_enabled', 'test_otp_mode_enabled', 'allow_coupon_stacking', 'allow_flash_sale_stacking', 'prepaid_discount_enabled', 'trending_slider_enabled', 'is_pure_q_commerce'];
          for (const k of booleanKeys) {
            // Only process the boolean if it was explicitly sent in the payload
            if (updates[k] !== undefined) {
              if (updates[k] === true || updates[k] === 'true' || updates[k] === 'on') {
                updates[k] = 'true';
              } else {
                updates[k] = 'false';
              }
            }
          }
    
          if (updates.twilio_auth_token !== undefined && updates.twilio_account_sid !== undefined) {
            if (updates.twilio_auth_token && updates.twilio_account_sid) {
              updates.test_otp_mode_enabled = 'false';
            }
          }
        }
    
        // SEO update action
        if (updates.action === 'update_page_seo') {
          const pageId = updates.page_id;
          const seoData = { title: updates.title, desc: updates.desc };
          const newUpdates: Record<string, any> = {};
          newUpdates[`page_seo_${pageId}`] = seoData;
          await saveSettings(newUpdates);
    
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
    
        // Remove 'action' key before saving (not a settings field)
        delete updates.action;

        // CRITICAL BUG FIX: Remove any fields that have the placeholder '[HIDDEN]'
        // so that we don't accidentally overwrite real API keys with the string '[HIDDEN]'
        for (const [key, value] of Object.entries(updates)) {
          if (value === '[HIDDEN]') {
            delete updates[key];
          }
        }
    
        await saveSettings(updates);
    
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        console.error('Settings update error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error?.message || String(error),
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
  });
};
