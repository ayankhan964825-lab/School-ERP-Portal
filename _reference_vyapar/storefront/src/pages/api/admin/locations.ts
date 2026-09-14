import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { getPermissionContext } from '../../../lib/permissions';

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const storeId = locals.storeId;
    if (!storeId) return new Response(JSON.stringify({ error: 'Store ID missing' }), { status: 400 });

    if (isSupabase && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('locations')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 200 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const storeId = locals.storeId;
    if (!storeId) return new Response(JSON.stringify({ error: 'Store ID missing' }), { status: 400 });

    const ctx = getPermissionContext(cookies);
    if (ctx.adminRole !== 'super_admin' && ctx.permissions['settings'] !== 'manage') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const body = await request.json();
    
    // Parse delivery pincodes string into array
    let delivery_pincodes = [];
    if (body.delivery_pincodes && typeof body.delivery_pincodes === 'string') {
      delivery_pincodes = body.delivery_pincodes.split(',').map((p: string) => p.trim()).filter((p: string) => p);
    }

    if (isSupabase && supabaseAdmin) {
      const payload = {
        store_id: storeId,
        name: body.name,
        is_default: body.is_default === true || body.is_default === 'true',
        is_active: body.is_active !== false && body.is_active !== 'false',
        address_line1: body.address_line1,
        address_line2: body.address_line2,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        country: body.country || 'India',
        q_commerce_enabled: body.q_commerce_enabled === true || body.q_commerce_enabled === 'true',
        auto_assign_riders: body.auto_assign_riders === true || body.auto_assign_riders === 'true' || body.auto_assign_riders === 'on',
        q_commerce_eta: body.q_commerce_eta,
        q_commerce_sla_mins: parseInt(body.q_commerce_sla_mins) || 30,
        zone_type: body.zone_type || 'none',
        delivery_radius_km: parseInt(body.delivery_radius_km) || null,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        delivery_pincodes,
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email
      };

      // If this is set as default, unset others first
      if (payload.is_default) {
        await supabaseAdmin.from('locations').update({ is_default: false }).eq('store_id', storeId);
      }

      const { data, error } = await supabaseAdmin
        .from('locations')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, location: data }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), { status: 500 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const storeId = locals.storeId;
    if (!storeId) return new Response(JSON.stringify({ error: 'Store ID missing' }), { status: 400 });

    const ctx = getPermissionContext(cookies);
    if (ctx.adminRole !== 'super_admin' && ctx.permissions['settings'] !== 'manage') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const body = await request.json();
    const { id } = body;
    if (!id) return new Response(JSON.stringify({ error: 'Location ID missing' }), { status: 400 });

    let delivery_pincodes = [];
    if (body.delivery_pincodes && typeof body.delivery_pincodes === 'string') {
      delivery_pincodes = body.delivery_pincodes.split(',').map((p: string) => p.trim()).filter((p: string) => p);
    } else if (Array.isArray(body.delivery_pincodes)) {
      delivery_pincodes = body.delivery_pincodes;
    }

    if (isSupabase && supabaseAdmin) {
      const payload = {
        name: body.name,
        is_default: body.is_default === true || body.is_default === 'true',
        is_active: body.is_active !== false && body.is_active !== 'false',
        address_line1: body.address_line1,
        address_line2: body.address_line2,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        country: body.country,
        q_commerce_enabled: body.q_commerce_enabled === true || body.q_commerce_enabled === 'true',
        auto_assign_riders: body.auto_assign_riders === true || body.auto_assign_riders === 'true' || body.auto_assign_riders === 'on',
        q_commerce_eta: body.q_commerce_eta,
        q_commerce_sla_mins: parseInt(body.q_commerce_sla_mins) || 30,
        zone_type: body.zone_type || 'none',
        delivery_radius_km: parseInt(body.delivery_radius_km) || null,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        delivery_pincodes,
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
        contact_email: body.contact_email,
        updated_at: new Date().toISOString()
      };

      if (payload.is_default) {
        await supabaseAdmin.from('locations').update({ is_default: false }).eq('store_id', storeId);
      }

      const { data, error } = await supabaseAdmin
        .from('locations')
        .update(payload)
        .eq('id', id)
        .eq('store_id', storeId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, location: data }), { status: 200 });
    }
    
    return new Response(JSON.stringify({ success: false, error: 'Database not configured' }), { status: 500 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const storeId = locals.storeId;
    if (!storeId) return new Response(JSON.stringify({ error: 'Store ID missing' }), { status: 400 });

    const ctx = getPermissionContext(cookies);
    if (ctx.adminRole !== 'super_admin' && ctx.permissions['settings'] !== 'manage') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const body = await request.json();
    const { id } = body;
    
    if (isSupabase && supabaseAdmin) {
      // Soft delete by setting is_active to false to prevent breaking inventory relationships
      const { error } = await supabaseAdmin
        .from('locations')
        .update({ is_active: false })
        .eq('id', id)
        .eq('store_id', storeId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    
    return new Response(JSON.stringify({ success: false }), { status: 500 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
