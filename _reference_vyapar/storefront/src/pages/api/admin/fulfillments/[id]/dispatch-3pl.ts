import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../../../lib/permissions';
import { storeContext } from '../../../../../lib/storeContext';
import { createDunzoTask } from '../../../../../lib/dunzo';
import { createShadowfaxTask } from '../../../../../lib/shadowfax';

export const POST: APIRoute = async ({ request, cookies, params, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const fulfillmentId = params.id;
      if (!fulfillmentId) return new Response(JSON.stringify({ error: 'Fulfillment ID required' }), { status: 400 });

      const ctx = getPermissionContext(cookies);
      if (!canManageSection(ctx, 'orders')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const body = await request.json();
      const { order_id, partner } = body;

      if (!order_id || !partner) {
        return new Response(JSON.stringify({ error: 'Missing order_id or partner' }), { status: 400 });
      }
      
      if (partner !== 'dunzo' && partner !== 'shadowfax') {
        return new Response(JSON.stringify({ error: 'Invalid 3PL partner' }), { status: 400 });
      }

      // Fetch fulfillment
      const { data: fData, error: fErr } = await supabaseAdmin
        .from('fulfillments')
        .select('*, order_id')
        .eq('id', fulfillmentId)
        .eq('store_id', locals.storeId)
        .single();
        
      if (fErr || !fData) return new Response(JSON.stringify({ error: 'Fulfillment not found' }), { status: 404 });

      // Call the respective 3PL API
      let apiResult;
      
      const payload = {
         fulfillment_id: fulfillmentId,
         order_id: order_id
      };

      if (partner === 'dunzo') {
        apiResult = await createDunzoTask(payload);
      } else if (partner === 'shadowfax') {
        apiResult = await createShadowfaxTask(payload);
      }

      if (!apiResult || !apiResult.success) {
        return new Response(JSON.stringify({ error: `Failed to dispatch via ${partner}` }), { status: 500 });
      }

      // Update fulfillment
      const { error: updateErr } = await supabaseAdmin
        .from('fulfillments')
        .update({
          rider_name: partner === 'dunzo' ? 'Dunzo Rider' : 'Shadowfax Rider',
          rider_phone: 'Pending...',
          rider_status: 'assigned',
          awb_number: apiResult.task_id,
          courier_name: partner === 'dunzo' ? 'Dunzo' : 'Shadowfax',
          tracking_url: apiResult.tracking_url,
          status: 'shipped'
        })
        .eq('id', fulfillmentId)
        .eq('store_id', locals.storeId);

      if (updateErr) {
        console.error('Failed to update DB after dispatch:', updateErr);
        return new Response(JSON.stringify({ error: 'Failed to update database' }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true, tracking_url: apiResult.tracking_url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error(e);
      return new Response(JSON.stringify({ error: e.message || 'Internal server error' }), { status: 500 });
    }
  });
};
