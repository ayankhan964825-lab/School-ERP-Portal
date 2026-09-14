import type { APIRoute } from 'astro';
import { getPermissionContext } from '../../../lib/permissions';
import { savePlatformSettings } from '../../../lib/platform-settings';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";
import { z } from 'zod';

const platformSettingsSchema = z.object({
  auth_mode: z.enum(['phone_only', 'email_only', 'both']).optional(),
  otp_length: z.enum(['4', '6']).optional(),
  resend_api_key: z.string().optional(),
  twilio_account_sid: z.string().optional(),
  twilio_auth_token: z.string().optional(),
  twilio_phone_number: z.string().optional(),
  platform_name: z.string().optional(),
  support_email: z.string().email().optional(),
  platform_domain: z.string().optional(),
  default_commission: z.coerce.number().min(0).max(100).optional(),
  platform_tax: z.coerce.number().min(0).max(100).optional(),
  razorpay_api_key: z.string().optional(),
  razorpay_api_secret: z.string().optional()
});

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const ctx = getPermissionContext(cookies);
        if (ctx.adminRole !== 'super_admin' || !ctx.isOriginalSuperAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized. Original Super Admin only.' }), { status: 403 });
        }
    
        const formData = await request.formData();
        const csrfToken = formData.get('_csrf')?.toString();
    
        if (!validateCsrfToken(request, cookies, csrfToken)) {
          return new Response(JSON.stringify({ error: "Invalid CSRF token" }), { status: 403 });
        }
    
        const rawUpdates: any = {};
        for (const [key, value] of formData.entries()) {
          if (key === '_csrf') continue;
          rawUpdates[key] = value.toString() === '[HIDDEN]' ? undefined : value.toString();
        }

        // Validate using Zod
        const parsedResult = platformSettingsSchema.safeParse(rawUpdates);
        if (!parsedResult.success) {
          return new Response(JSON.stringify({ 
            error: 'Validation Error', 
            details: parsedResult.error.issues 
          }), { status: 400 });
        }

        const updates = parsedResult.data as any;
    
        // Clean undefined values
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
    
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const success = await savePlatformSettings(updates);
          if (!success) throw new Error('Failed to save to database');
          
          const modifiedFields = Object.keys(updates).filter(k => k !== 'updated_at');
          await logAdminActivity(ctx, request, 'Updated Platform Settings', `Fields: ${modifiedFields.join(', ')}`);
        }
    
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (error: any) {
        console.error('Update Platform Settings Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
  });
};
