import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { saveShippingZone, updateShippingZone, deleteShippingZone, saveSettings } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'settings')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        const { action, id, ...data } = body;
    
        if (action === 'save_global') {
          // Save global shipping settings (free shipping threshold, flat rate, etc.)
          const updates: any = {};
          
          if (data.free_shipping_threshold !== undefined) updates.free_shipping_threshold = data.free_shipping_threshold;
          if (data.flat_shipping_rate !== undefined) updates.flat_shipping_rate = data.flat_shipping_rate;
          if (data.delivery_days_min !== undefined) updates.delivery_days_min = data.delivery_days_min;
          if (data.delivery_days_max !== undefined) updates.delivery_days_max = data.delivery_days_max;
          if (data.max_cod_amount !== undefined) updates.max_cod_amount = data.max_cod_amount;
          if (data.cod_enabled !== undefined) updates.cod_enabled = data.cod_enabled ? 'true' : 'false';
          if (data.restricted_pincodes !== undefined) updates.restricted_pincodes = data.restricted_pincodes;
          if (data.minimum_order_amount !== undefined) updates.minimum_order_amount = data.minimum_order_amount;
          if (data.state_shipping_rules !== undefined) updates.state_shipping_rules = data.state_shipping_rules;
          if (data.is_pure_q_commerce !== undefined) updates.is_pure_q_commerce = data.is_pure_q_commerce ? 'true' : 'false';
          if (data.reverse_shipping_enabled !== undefined) updates.reverse_shipping_enabled = data.reverse_shipping_enabled ? 'true' : 'false';
          if (data.reverse_shipping_rate !== undefined) updates.reverse_shipping_rate = data.reverse_shipping_rate;

          await saveSettings(updates);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'generate_waybill') {
          if (!data.orderId) return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
          
          const { getOrders, updateOrderAwb, updateOrderStatus, getSettings } = await import('../../../lib/database');
          const { ShippingService } = await import('../../../lib/ShippingService');
          
          const orders = await getOrders();
          const order = orders.find((o: any) => o.orderId === data.orderId || o.order_id === data.orderId);
          if (!order) return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });

          // Support for Multi-Warehouse Fulfillments
          let fulfillment = null;
          let targetItems = order.items || [];
          if (data.fulfillmentId && order.fulfillments) {
            fulfillment = order.fulfillments.find((f: any) => f.id === data.fulfillmentId);
            if (fulfillment && fulfillment.items) {
              targetItems = fulfillment.items;
            }
          }
          
          const settings = await getSettings();
          const defaultWeight = parseFloat(settings.icarry_default_weight) || 0.5;
    
          // Smart Weight Calculator
          let totalCalculatedWeight = 0;
          
          targetItems.forEach((item: any) => {
            const qty = item.quantity || item.units || 1;
            const variantStr = (item.variant || item.weight || '').toLowerCase();
            let itemWeight = 0; 
            
            if (variantStr.includes('kg')) {
              const match = variantStr.match(/(\d+(\.\d+)?)\s*kg/);
              if (match && match[1]) itemWeight = parseFloat(match[1]);
            } else if (variantStr.includes('g') && !variantStr.includes('kg')) {
              const match = variantStr.match(/(\d+(\.\d+)?)\s*g/);
              if (match && match[1]) itemWeight = parseFloat(match[1]) / 1000;
            }
            
            // Use default weight per item if parsing fails
            if (isNaN(itemWeight) || itemWeight <= 0) itemWeight = defaultWeight;
            totalCalculatedWeight += (itemWeight * qty);
          });
    
          const finalWeight = totalCalculatedWeight > 0 ? parseFloat(totalCalculatedWeight.toFixed(2)) : defaultWeight;

          // Create custom order ID string for iCarry (prevent duplicate order IDs on split shipments)
          const icarryOrderId = fulfillment ? `${order.orderId}-${fulfillment.id.substring(0,6)}` : order.orderId;
    
          const payload = {
            order_id: icarryOrderId,
            order_date: new Date(order.createdAt || Date.now()).toISOString().split('T')[0],
            billing_customer_name: order.customer?.name || 'Customer',
            billing_address: order.customer?.address || 'Unknown Address',
            billing_city: order.customer?.city || 'Unknown',
            billing_pincode: order.customer?.pincode || '000000',
            billing_state: order.customer?.state || 'Unknown',
            billing_country: 'India',
            billing_email: order.customer?.email || 'test@example.com',
            billing_phone: order.customer?.phone || '9999999999',
            shipping_is_billing: true,
            order_items: targetItems.map((i: any) => ({
              name: i.name,
              sku: i.sku || i.name.replace(/\s+/g, '-').toUpperCase(),
              units: i.quantity || 1,
              selling_price: i.price || 0
            })),
            payment_method: ((order.paymentMethod || 'Prepaid').toUpperCase() === 'COD' ? 'COD' : 'Prepaid') as 'Prepaid' | 'COD',
            sub_total: order.amount || 0,
            length: 10,
            breadth: 10,
            height: 10,
            weight: finalWeight
          };
    
          // Identify if order is Q-Commerce based on order properties, items, or global settings
          const isQCommerce = order.deliveryType === 'q_commerce' || order.shippingMethod === 'hyperlocal' || settings?.is_pure_q_commerce === 'true' || settings?.is_pure_q_commerce === true || targetItems.some((i: any) => i.is_q_commerce_only) || false;

          const result = await ShippingService.generateAWB(payload, isQCommerce);
    
          if (!result.success) {
            return new Response(JSON.stringify({ error: 'error' in result ? result.error : 'Failed to generate AWB' }), { status: 500 });
          }
    
          await updateOrderAwb(order.orderId, result.awb_code, {
            courier_partner:    result.courier_name  || 'iCarry Partner',
            routing_code:       undefined,
            package_weight:     `${finalWeight} KG`,
            package_dimensions: '10*10*10 CM',
            label_url:          result.label_url     || '#',
            fulfillmentId:      fulfillment?.id
          });
          await updateOrderStatus(order.orderId, 'shipped');
    
          return new Response(JSON.stringify({ 
            success: true, 
            awb: result.awb_code,
            courier: result.courier_name,
            label_url: result.label_url 
          }), { status: 200 });
        }
    
        if (action === 'create_bulk_zones') {
          const { zones } = data;
          if (!Array.isArray(zones) || zones.length === 0) {
            return new Response(JSON.stringify({ error: 'No zones provided' }), { status: 400 });
          }
    
          const createdZones = [];
          for (const zoneData of zones) {
            if (!zoneData.name) continue;
            const zone = await saveShippingZone(zoneData);
            createdZones.push(zone);
          }
          return new Response(JSON.stringify({ success: true, count: createdZones.length, zones: createdZones }), { status: 200 });
        }
    
        if (action === 'create_zone') {
          if (!data.name) return new Response(JSON.stringify({ error: 'Zone name is required' }), { status: 400 });
          const zone = await saveShippingZone(data);
          return new Response(JSON.stringify({ success: true, zone }), { status: 200 });
        }
    
        if (action === 'update_zone') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          const updated = await updateShippingZone(id, data);
          if (!updated) return new Response(JSON.stringify({ error: 'Zone not found' }), { status: 404 });
          return new Response(JSON.stringify({ success: true, zone: updated }), { status: 200 });
        }
    
        if (action === 'delete_zone') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          await deleteShippingZone(id);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error: any) {
        console.error('Shipping API error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
      }
  });
};
