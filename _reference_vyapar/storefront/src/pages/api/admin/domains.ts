import type { APIRoute } from 'astro';
import { getSettings, saveSettings } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const storeId = locals.storeId || '';
    if (!storeId) {
        return new Response(JSON.stringify({ error: 'Store context missing' }), { status: 400 });
      }
    try {
        const body = await request.json();
        const { custom_domain } = body;
    
        // Fetch existing settings
        const currentSettings = await getSettings();
    
        // Setup payload
        const newSettings: any = {
          ...currentSettings,
          custom_domain: custom_domain || '',
          custom_domain_status: custom_domain ? 'pending' : 'none',
        };
    
        // Check if Vercel API is available
        const vercelToken = import.meta.env.VERCEL_API_TOKEN || process.env.VERCEL_API_TOKEN;
        const projectId = import.meta.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
    
        if (custom_domain && vercelToken && projectId) {
          // Vercel Automatic Mode
          const teamId = import.meta.env.VERCEL_TEAM_ID || process.env.VERCEL_TEAM_ID;
          let url = `https://api.vercel.com/v10/projects/${projectId}/domains`;
          if (teamId) {
            url += `?teamId=${teamId}`;
          }
    
          const vercelRes = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${vercelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: custom_domain }),
          });
    
          if (vercelRes.ok) {
            newSettings.custom_domain_status = 'active'; // or 'pending_verification' based on Vercel
          } else {
            const errData = await vercelRes.json();
            console.error('[Vercel Domains API Error]', errData);
            // Fallback to manual mode if Vercel fails
            newSettings.custom_domain_status = 'pending';
          }
        }
    
        // Save to settings
        await saveSettings(newSettings);
    
        return new Response(JSON.stringify({ success: true, settings: newSettings }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('[API: Admin Domains] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  });
};
