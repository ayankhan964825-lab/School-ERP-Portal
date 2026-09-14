import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../../../lib/permissions';

export const POST: APIRoute = async ({ request, cookies, params, locals }) => {
  const ctx = getPermissionContext(cookies);
  if (!canManageSection(ctx, "orders")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  try {
    const { id } = params; // fulfillmentId
    const { rider_name, rider_phone } = await request.json();

    if (!id || !rider_name || !rider_phone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const { data: fData, error } = await supabaseAdmin!
      .from('fulfillments')
      .update({ 
        rider_name: rider_name, 
        rider_phone: rider_phone, 
        rider_status: 'assigned'
      })
      .eq('id', id)
      .eq('store_id', locals.storeId)
      .select('order_id, store_id')
      .single();

    if (error) throw error;

    const { updateOrderStatus } = await import('../../../../../lib/database');
    await updateOrderStatus(fData.order_id, 'shipped', fData.store_id, id as string);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('Assign Rider Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
