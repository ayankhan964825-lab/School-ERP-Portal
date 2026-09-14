/**
 * iCarry.in Logistics API Wrapper
 * 
 * Handles rate estimation, shipment booking (AWB generation), and tracking.
 * Requires `icarry_api_token` in Admin Settings.
 */
import { getSettings } from './database';
import { fetchWithRetry } from './fetch-retry';

const ICARRY_API_BASE = 'https://api.icarry.in/v1'; // Standard base URL for iCarry API

export interface CreateShipmentPayload {
  order_id: string;
  order_date: string;
  pickup_location?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
  }>;
  payment_method: 'Prepaid' | 'COD';
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

/**
 * Helper to get authorization headers
 */
async function getAuthHeaders() {
  const settings = await getSettings();
  if (!settings.icarry_api_token) {
    throw new Error('iCarry API Token is not configured in settings.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${settings.icarry_api_token}`
  };
}

/**
 * Creates a shipment (Generates AWB)
 */
export async function createShipment(payload: CreateShipmentPayload) {
  const settings = await getSettings();
  
  // If no token is configured, simulate a successful response for development/testing
  if (!settings.icarry_api_token) {
    console.log('[iCarry Mock] Creating shipment for order:', payload.order_id);
    console.log('[iCarry Mock] Payload:', JSON.stringify(payload, null, 2));
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      awb_code: `MOCK_AWB_${Math.floor(Math.random() * 100000000)}`,
      courier_name: 'Xpressbees (Mock)',
      shipment_id: `SHIP_${payload.order_id}`,
      label_url: '#'
    };
  }

  try {
    const headers = await getAuthHeaders();
    
    const response = await fetchWithRetry(`${ICARRY_API_BASE}/orders/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create iCarry shipment');
    }

    return {
      success: true,
      awb_code: data.awb_number || data.awb_code,
      courier_name: data.courier_name || 'iCarry Partner',
      shipment_id: data.shipment_id,
      label_url: data.label_url || '#'
    };
  } catch (error: any) {
    console.error('[iCarry API Error]', error);
    return {
      success: false,
      error: error.message || 'An error occurred while connecting to iCarry.'
    };
  }
}

/**
 * Tracks a shipment using AWB
 */
export async function trackShipment(awbCode: string) {
  const settings = await getSettings();
  
  // Mock tracking
  if (!settings.icarry_api_token || awbCode.startsWith('MOCK_AWB')) {
    return {
      success: true,
      current_status: 'In Transit',
      tracking_history: [
        { status: 'Manifested', date: new Date(Date.now() - 86400000).toISOString(), location: 'Warehouse' },
        { status: 'In Transit', date: new Date().toISOString(), location: 'Sorting Hub' }
      ]
    };
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry(`${ICARRY_API_BASE}/track/awb/${awbCode}`, {
      method: 'GET',
      headers
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to track shipment');

    return {
      success: true,
      current_status: data.current_status,
      tracking_history: data.tracking_data || []
    };
  } catch (error: any) {
    console.error('[iCarry Tracking Error]', error);
    return { success: false, error: error.message };
  }
}
