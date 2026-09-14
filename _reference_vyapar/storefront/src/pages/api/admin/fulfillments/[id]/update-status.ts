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
    const { status } = await request.json();

    if (!id || !status) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const { data: fData } = await supabaseAdmin!.from('fulfillments').select('order_id, store_id').eq('id', id).eq('store_id', locals.storeId).single();
    if (!fData) throw new Error('Fulfillment not found');

    const { updateOrderStatus } = await import('../../../../../lib/database');
    await updateOrderStatus(fData.order_id, status, fData.store_id, id as string);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('Update Status Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
