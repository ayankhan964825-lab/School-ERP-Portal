import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'customers')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const { email } = await request.json();
    
        if (!email || !email.includes('@')) {
          return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
        }
    
        // Save to Supabase if live, silently succeed otherwise
        if (supabase) {
          const { error } = await supabase
            .from(TABLES.NEWSLETTER_SUBSCRIBERS)
            .upsert({ email: email.toLowerCase().trim(), subscribed_at: new Date().toISOString() }, { onConflict: 'email' });
    
          if (error) console.error('[Newsletter] Supabase error:', error.message);
        }
    
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
      }
  });
};
