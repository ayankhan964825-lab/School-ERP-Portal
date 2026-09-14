import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { getSettings, supabaseAdmin, isSupabase } from '../../../lib/database';
import { getTenantId } from '../../../lib/storeContext';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  const ctx = getPermissionContext(cookies);
  if (!canManageSection(ctx, 'settings')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const tenantId = getTenantId();
    
    // 1. Raw Supabase query (bypasses all our parsing)
    let rawData: any = null;
    if (isSupabase && supabaseAdmin) {
      // Use the raw client to avoid tenant proxy interference
      const { data, error } = await supabaseAdmin.from(TABLES.SETTINGS).select('id, store_id, pages_content').limit(1).single();
      rawData = { data, error: error?.message || null };
    }

    // 2. Parsed via our getSettings()
    const parsed = await getSettings();

    return new Response(JSON.stringify({
      tenant_id: tenantId,
      raw_supabase: rawData,
      parsed_settings: {
        team_members: parsed?.team_members,
        team_members_type: typeof parsed?.team_members,
        team_members_isArray: Array.isArray(parsed?.team_members),
        team_members_length: Array.isArray(parsed?.team_members) ? parsed.team_members.length : 'N/A',
        team_visibility: parsed?.team_visibility,
        team_visibility_type: typeof parsed?.team_visibility,
        pages_content_keys: parsed?.pages_content ? Object.keys(parsed.pages_content) : [],
        pages_content_team_members: parsed?.pages_content?.team_members,
        pages_content_team_members_type: typeof parsed?.pages_content?.team_members,
        pages_content_team_visibility: parsed?.pages_content?.team_visibility,
      }
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), { status: 500 });
  }
};
