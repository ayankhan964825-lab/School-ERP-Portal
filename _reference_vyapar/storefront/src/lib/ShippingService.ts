import { getSettings } from './database';
import { createShipment as createICarryShipment } from './icarry';
import { createShiprocketShipment } from './shiprocket';
import { createPorterShipment } from './porter';
import type { CreateShipmentPayload } from './icarry';

export class ShippingService {
  /**
   * Routes the AWB generation request to the appropriate logistics partner
   * based on admin settings and order type.
   */
  static async generateAWB(payload: CreateShipmentPayload, isQCommerce: boolean = false) {
    const settings = await getSettings();
    
    // 1. Q-Commerce Routing (Porter / Dunzo)
    if (isQCommerce) {
      const hyperlocalPartner = settings?.hyperlocal_courier_partner;
      if (hyperlocalPartner === 'porter') {
        return await createPorterShipment(payload);
      }
      // If no hyperlocal partner configured, fallback to default courier
    }

    // 2. Standard Courier Routing
    let defaultCourier = settings?.default_courier_partner;

    // Backward Compatibility: If default courier is not explicitly set, 
    // but iCarry token exists, route to iCarry.
    if (!defaultCourier && settings?.icarry_api_token) {
      defaultCourier = 'icarry';
    }

    switch (defaultCourier) {
      case 'shiprocket':
        return await createShiprocketShipment(payload);
      case 'delhivery':
         return {
            success: true,
            awb_code: `DLV_${Date.now()}`,
            courier_name: 'Delhivery',
            label_url: '#'
        };
      case 'icarry':
      default:
        // Default fallback is iCarry (or mock if no keys are set anywhere)
        return await createICarryShipment(payload);
    }
  }
}
