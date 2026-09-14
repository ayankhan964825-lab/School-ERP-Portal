import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';

export const GET: APIRoute = async ({ request }) => {
  if (!isSupabase) return new Response(JSON.stringify({ error: 'DB not connected' }), { status: 500 });
  
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order_id');
    
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), { status: 400 });
    }

    const { data: orderData } = await supabaseAdmin
      .from('orders')
      .select('rider_id, status')
      .eq('id', orderId)
      .single();

    if (!orderData || !orderData.rider_id) {
      return new Response(JSON.stringify({ error: 'Rider not found or not assigned' }), { status: 404 });
    }

    const { data: riderData } = await supabaseAdmin
      .from('riders')
      .select('current_lat, current_lng, updated_at')
      .eq('id', orderData.rider_id)
      .single();

    if (!riderData) {
      return new Response(JSON.stringify({ error: 'Rider details not found' }), { status: 404 });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      status: orderData.status,
      rider: {
        lat: riderData.current_lat,
        lng: riderData.current_lng,
        last_updated: riderData.updated_at
      }
    }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
