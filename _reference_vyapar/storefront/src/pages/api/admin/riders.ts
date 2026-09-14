import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  if (!isSupabase) return new Response(JSON.stringify({ error: 'Database not connected' }), { status: 500 });
  
  const ctx = getPermissionContext(cookies);
  if (!canManageSection(ctx, 'shipping')) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 });
  }

  const storeId = locals.storeId;
  if (!storeId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const data = await request.json();
    
    if (!data.name || !data.phone) {
      return new Response(JSON.stringify({ error: 'Name and Phone are required' }), { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('riders')
      .insert({
        store_id: storeId,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        vehicle_type: data.vehicle_type || 'bike',
        vehicle_number: data.vehicle_number || null,
        status: data.status || 'active',
        is_online: false
      });

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'A rider with this phone number already exists' }), { status: 400 });
      }
      throw error;
    }

    return new Response(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error('Rider Create Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, cookies, locals }) => {
  if (!isSupabase) return new Response(JSON.stringify({ error: 'Database not connected' }), { status: 500 });
  
  const ctx = getPermissionContext(cookies);
  if (!canManageSection(ctx, 'shipping')) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 });
  }

  const storeId = locals.storeId;
  if (!storeId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const data = await request.json();
    if (!data.id) return new Response(JSON.stringify({ error: 'Rider ID required' }), { status: 400 });

    const { error } = await supabaseAdmin
      .from('riders')
      .update({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        vehicle_type: data.vehicle_type || 'bike',
        vehicle_number: data.vehicle_number || null,
        status: data.status || 'active'
      })
      .eq('id', data.id)
      .eq('store_id', storeId);

    if (error) throw error;
    return new Response(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error('Rider Update Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
  if (!isSupabase) return new Response(JSON.stringify({ error: 'Database not connected' }), { status: 500 });
  
  const ctx = getPermissionContext(cookies);
  if (!canManageSection(ctx, 'shipping')) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 });
  }

  const storeId = locals.storeId;
  if (!storeId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return new Response(JSON.stringify({ error: 'Rider ID required' }), { status: 400 });

    const { error } = await supabaseAdmin
      .from('riders')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) throw error;
    return new Response(JSON.stringify({ success: true }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
