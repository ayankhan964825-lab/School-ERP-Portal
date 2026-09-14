import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { verifyRiderAuth } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSupabase) return new Response(JSON.stringify({ error: 'DB not connected' }), { status: 500 });
  
  try {
    const token = cookies.get('vyaparpe_rider_id')?.value;
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    
    const authPayload = verifyRiderAuth(token);
    if (!authPayload || !authPayload.riderId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { riderId, lat, lng } = await request.json();
    if (!riderId || !lat || !lng) {
      return new Response(JSON.stringify({ error: 'Missing coordinates or Rider ID' }), { status: 400 });
    }
    
    if (riderId !== authPayload.riderId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

    const { error } = await supabaseAdmin
      .from('riders')
      .update({ current_lat: lat, current_lng: lng, updated_at: new Date().toISOString() })
      .eq('id', riderId)
      .eq('store_id', authPayload.storeId);

    if (error) throw error;
    
    // As the rider updates location (acting as a heartbeat), attempt to auto-assign any pending orders
    const { runAutoAssign } = await import('../../../lib/autoAssign');
    await runAutoAssign().catch(e => console.error('Auto-assign failed on location update:', e));
    
    return new Response(JSON.stringify({ success: true }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
