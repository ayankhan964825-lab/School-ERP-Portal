import { getSettings } from './database';
import { fetchWithRetry } from './fetch-retry';
import type { CreateShipmentPayload } from './icarry';

const PORTER_API_BASE = 'https://papi.porter.in/v1';

export async function createPorterShipment(payload: CreateShipmentPayload) {
  const settings = await getSettings();
  
  if (!settings.porter_api_key) {
    console.log('[Porter Mock] Creating hyperlocal shipment for order:', payload.order_id);
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return {
      success: true,
      awb_code: `PORTER_MOCK_${Math.floor(Math.random() * 100000000)}`,
      courier_name: 'Porter Hyperlocal (Mock)',
      shipment_id: `PORT_SHIP_${payload.order_id}`,
      label_url: '#'
    };
  }

  try {
    const porterPayload = {
      order_id: payload.order_id,
      pickup_details: {
        address: "Store Location" // Normally fetched from store settings
      },
      drop_details: {
        name: payload.billing_customer_name + (payload.billing_last_name ? ` ${payload.billing_last_name}` : ''),
        phone: payload.billing_phone,
        address: `${payload.billing_address}, ${payload.billing_city}, ${payload.billing_state} - ${payload.billing_pincode}`
      },
      item_details: {
        weight: payload.weight
      }
    };

    const response = await fetchWithRetry(`${PORTER_API_BASE}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.porter_api_key
      },
      body: JSON.stringify(porterPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create Porter shipment');
    }

    return {
      success: true,
      awb_code: data.order_id || data.tracking_id,
      courier_name: 'Porter Hyperlocal',
      shipment_id: data.order_id,
      label_url: data.tracking_url || '#'
    };
  } catch (error: any) {
    console.error('[Porter API Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to generate hyperlocal AWB via Porter'
    };
  }
}
