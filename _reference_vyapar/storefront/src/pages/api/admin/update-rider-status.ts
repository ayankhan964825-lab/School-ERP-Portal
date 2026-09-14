import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { updateOrderStatus } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();
    
    // In a real app, this endpoint should be secured via API key (for 3rd party webhooks)
    // or via JWT/session for the In-House Rider App.
    // We assume `fulfillmentId` and `status` are passed securely.
    
    const { fulfillmentId, riderStatus, trackingUpdate } = body;

    if (!fulfillmentId || !riderStatus) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
    }

    const webhookSecret = request.headers.get('x-webhook-secret');
    const validSecret = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    let isAuthorized = false;
    let storeIdFilter = null;

    if (webhookSecret && validSecret && webhookSecret === validSecret) {
      isAuthorized = true; // Authorized via external secure webhook
    } else {
      const ctx = getPermissionContext(cookies);
      if (canManageSection(ctx, 'orders')) {
        isAuthorized = true;
        storeIdFilter = locals.storeId; // Enforce BOLA for logged-in admins
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    // Update fulfillment rider status
    let query = supabaseAdmin
      .from('fulfillments')
      .update({
        rider_status: riderStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', fulfillmentId);
      
    if (storeIdFilter) {
      query = query.eq('store_id', storeIdFilter);
    }

    const { data: fulfillment, error } = await query
      .select('order_id, store_id')
      .single();

    if (error || !fulfillment) {
      throw error || new Error('Fulfillment not found');
    }

    // If rider status is 'delivered', we automatically update the fulfillment (and possibly order) status
    if (riderStatus === 'delivered') {
      await supabaseAdmin.from('fulfillments').update({ status: 'delivered' }).eq('id', fulfillmentId);
      
      // Auto-update master order status to delivered.
      // Note: If an order has multiple fulfillments, we should technically check if ALL are delivered.
      // For simplicity in Sprint 1.6, we mark the whole order as delivered.
      await updateOrderStatus(fulfillment.order_id, 'delivered', fulfillment.store_id, fulfillmentId);
    } else if (riderStatus === 'en_route') {
      // Mark fulfillment as shipped
      await supabaseAdmin.from('fulfillments').update({ status: 'shipped' }).eq('id', fulfillmentId);
      await updateOrderStatus(fulfillment.order_id, 'shipped', fulfillment.store_id, fulfillmentId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Rider status updated successfully'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error updating rider status:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
