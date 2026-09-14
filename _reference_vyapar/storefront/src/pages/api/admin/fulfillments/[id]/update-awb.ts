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
    const { awb_number, courier_name } = await request.json();

    if (!id || !awb_number) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const { error } = await supabaseAdmin!
      .from('fulfillments')
      .update({ awb_number, courier_name })
      .eq('id', id)
      .eq('store_id', locals.storeId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('Update AWB Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
