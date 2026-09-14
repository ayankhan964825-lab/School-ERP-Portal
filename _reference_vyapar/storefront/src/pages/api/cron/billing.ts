import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Standardize security check for cron endpoints via Authorization header
    const authHeader = request.headers.get('authorization');
    const envSecret = process.env.CRON_SECRET || import.meta.env.CRON_SECRET;
    
    if (!envSecret || authHeader !== `Bearer ${envSecret}`) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Database client not configured" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Call the Postgres RPC
    const { data, error } = await supabaseAdmin.rpc('process_daily_billing');

    if (error) {
      console.error('[CRON BILLING] Error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[CRON BILLING] Exception:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
