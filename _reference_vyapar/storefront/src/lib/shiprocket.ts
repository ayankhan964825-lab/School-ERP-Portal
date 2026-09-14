import { getSettings } from './database';
import { fetchWithRetry } from './fetch-retry';
import type { CreateShipmentPayload } from './icarry'; // We reuse the generic payload interface

const SHIPROCKET_API_BASE = 'https://apiv2.shiprocket.in/v1/external';

export async function createShiprocketShipment(payload: CreateShipmentPayload) {
  const settings = await getSettings();
  
  if (!settings.shiprocket_token) {
    console.log('[Shiprocket Mock] Creating shipment for order:', payload.order_id);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      awb_code: `SR_MOCK_${Math.floor(Math.random() * 100000000)}`,
      courier_name: 'Delhivery (Shiprocket Mock)',
      shipment_id: `SR_SHIP_${payload.order_id}`,
      label_url: '#'
    };
  }

  try {
    // Map our generic payload to Shiprocket's specific format
    const srPayload = {
      order_id: payload.order_id,
      order_date: payload.order_date, // Format: YYYY-MM-DD
      pickup_location: payload.pickup_location || 'Primary',
      billing_customer_name: payload.billing_customer_name,
      billing_last_name: payload.billing_last_name || '',
      billing_address: payload.billing_address,
      billing_city: payload.billing_city,
      billing_pincode: payload.billing_pincode,
      billing_state: payload.billing_state,
      billing_country: payload.billing_country || 'India',
      billing_email: payload.billing_email,
      billing_phone: payload.billing_phone,
      shipping_is_billing: payload.shipping_is_billing,
      order_items: payload.order_items.map(item => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: item.selling_price
      })),
      payment_method: payload.payment_method,
      sub_total: payload.sub_total,
      length: payload.length,
      breadth: payload.breadth,
      height: payload.height,
      weight: payload.weight
    };

    const response = await fetchWithRetry(`${SHIPROCKET_API_BASE}/orders/create/adrs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.shiprocket_token}`
      },
      body: JSON.stringify(srPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create Shiprocket shipment');
    }

    return {
      success: true,
      awb_code: data.awb_code,
      courier_name: data.courier_name || 'Shiprocket Partner',
      shipment_id: data.shipment_id,
      label_url: data.label_url || '#'
    };
  } catch (error: any) {
    console.error('[Shiprocket API Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to generate AWB via Shiprocket'
    };
  }
}
