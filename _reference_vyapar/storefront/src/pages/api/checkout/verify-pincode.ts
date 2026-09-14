import type { APIRoute } from 'astro';
import { getSettings, isSupabase, supabaseAdmin } from '../../../lib/database';
import { verifyPincodeBackend } from '../../../lib/checkout';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const settings = await getSettings();
        // Helper function to calculate ETA between two pincodes
        const calculateEta = (originPin: string, destPin: string) => {
          let min = settings?.delivery_days_min || 3;
          let max = settings?.delivery_days_max || 5;
          if (!originPin || !destPin || originPin.length !== 6 || destPin.length !== 6) {
             return { min, max };
          }
          const o = parseInt(originPin.substring(0, 2));
          const d = parseInt(destPin.substring(0, 2));
          
          if (o === d) return { min: 1, max: 3 }; // Same state
          
          const getZone = (p: number) => {
            if (p >= 10 && p <= 29) return 'NORTH'; // Delhi, UP, PB, HR, UK, HP, JK
            if (p >= 30 && p <= 49) return 'WEST_CENTRAL'; // RJ, GJ, MH, MP, CG
            if (p >= 50 && p <= 69) return 'SOUTH'; // AP, TS, KA, TN, KL
            if (p >= 70 && p <= 85) return 'EAST'; // WB, OR, BR, JH, NE
            return 'UNKNOWN';
          };
          
          const oZone = getZone(o);
          const dZone = getZone(d);
          
          if (oZone === dZone) return { min: 2, max: 4 }; // Same zone
          
          // Cross-zone far distance
          if ((oZone === 'NORTH' && dZone === 'SOUTH') || (oZone === 'SOUTH' && dZone === 'NORTH') ||
              (oZone === 'WEST_CENTRAL' && dZone === 'EAST') || (oZone === 'EAST' && dZone === 'WEST_CENTRAL')) {
            return { min: 4, max: 7 };
          }
          
          return { min: 3, max: 5 }; // General inter-zone
        };

        const { pincode, latitude, longitude, variant_id, paymentMethod } = await request.json();
    
        if (!pincode || pincode.length !== 6) {
          return new Response(JSON.stringify({ 
            valid: false, 
            allowCOD: false, 
            message: 'Please enter a valid 6-digit pincode.' 
          }), { status: 400 });
        }
        
        let isQCommerce = false;
        let finalEtaMin = settings?.delivery_days_min || 3;
        let finalEtaMax = settings?.delivery_days_max || 5;
        let eta = `Delivery In ${finalEtaMin}-${finalEtaMax} Days`;

        if (isSupabase && supabaseAdmin) {
          // 1. Get all active locations for the store
          const { data: locations } = await supabaseAdmin
            .from('locations')
            .select('id, pincode, is_default, q_commerce_enabled, zone_type, delivery_pincodes, q_commerce_eta, latitude, longitude, delivery_radius_km')
            .eq('is_active', true);
            // tenant proxy handles store_id filtering
          
          let validLocations = locations || [];

          // 2. If a specific variant is requested, filter locations by inventory availability
          if (variant_id && validLocations.length > 0) {
            const { data: inv } = await supabaseAdmin
              .from('inventory_levels')
              .select('location_id')
              .eq('variant_id', variant_id)
              .gt('available', 0);
            
            if (inv && inv.length > 0) {
              const inStockLocIds = new Set(inv.map(i => i.location_id));
              const stockedLocations = validLocations.filter(l => inStockLocIds.has(l.id));
              if (stockedLocations.length > 0) {
                validLocations = stockedLocations;
              }
            }
          }

          if (validLocations.length > 0) {
            let bestEtaMin = 999;
            let bestEtaMax = 999;

            for (const loc of validLocations) {
              // Check Q-Commerce first
              if (loc.q_commerce_enabled) {
                if (loc.zone_type === 'pincode' && loc.delivery_pincodes && loc.delivery_pincodes.includes(pincode)) {
                  isQCommerce = true;
                  eta = loc.q_commerce_eta || 'Delivery in 10-30 Mins';
                  bestEtaMin = 0; // Highest priority
                  break;
                } else if (loc.zone_type === 'radius' && loc.latitude && loc.longitude && latitude && longitude) {
                  const R = 6371;
                  const dLat = (latitude - loc.latitude) * Math.PI / 180;
                  const dLon = (longitude - loc.longitude) * Math.PI / 180;
                  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(loc.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  const distance = R * c;
                  if (distance <= (loc.delivery_radius_km || 0)) {
                    isQCommerce = true;
                    eta = loc.q_commerce_eta || 'Delivery in 10-30 Mins';
                    bestEtaMin = 0;
                    break;
                  }
                }
              }

              // Calculate standard ETA based on warehouse pincode
              // Default UP origin fallback if warehouse doesn't have a pincode
              const originPincode = loc.pincode || '226001'; 
              const calc = calculateEta(originPincode, pincode);
              if (calc.min < bestEtaMin) {
                bestEtaMin = calc.min;
                bestEtaMax = calc.max;
              }
            }

            if (!isQCommerce && bestEtaMin !== 999) {
              eta = `Delivery In ${bestEtaMin}-${bestEtaMax} Days`;
            }
          }
        }

        try {
          await verifyPincodeBackend(pincode, paymentMethod, settings);
          return new Response(JSON.stringify({ 
            valid: true, 
            allowCOD: true, 
            message: 'Delivery and Cash on Delivery available.',
            isQCommerce,
            eta
          }), { status: 200 });
        } catch (e: any) {
          if (e.message.includes('Cash on Delivery is not available') || e.message.includes('disabled')) {
            return new Response(JSON.stringify({ 
              valid: true, 
              allowCOD: false, 
              message: 'Delivery available (Prepaid only).',
              isQCommerce,
              eta
            }), { status: 200 });
          } else {
            return new Response(JSON.stringify({ 
              valid: false, 
              allowCOD: false, 
              message: e.message 
            }), { status: 200 }); // Return 200 so UI can display it cleanly
          }
        }
      } catch (error) {
        console.error('Verify Pincode Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
