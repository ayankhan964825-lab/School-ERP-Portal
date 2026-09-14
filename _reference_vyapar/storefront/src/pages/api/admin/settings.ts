import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { saveSettings } from '../../../lib/database';
import type { APIRoute } from 'astro';
import { storeContext } from "../../../lib/storeContext";
import { z } from 'zod';

const payloadSchema = z.object({
  action: z.string().optional(),
  settings: z.record(z.string(), z.any()).optional()
}).passthrough();

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'settings')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        let payload: any = {};
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          payload = await request.json();
        } else {
          const formData = await request.formData();
          for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
              payload[key] = value;
            }
          }
        }
        // Validate structural integrity of payload
        const parsedResult = payloadSchema.safeParse(payload);
        if (!parsedResult.success) {
           return new Response(JSON.stringify({ error: 'Invalid payload structure', details: parsedResult.error.issues }), { status: 400 });
        }
        
        const validPayload = parsedResult.data;
        const settingsToUpdate = validPayload.settings || validPayload;
        
        if (settingsToUpdate && typeof settingsToUpdate === 'object') {
          // CRITICAL BUG FIX: Remove any fields that have the placeholder '[HIDDEN]'
          for (const [key, value] of Object.entries(settingsToUpdate)) {
            if (value === '[HIDDEN]') {
              delete settingsToUpdate[key];
            }
          }
          await saveSettings(settingsToUpdate);
        }
    
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
