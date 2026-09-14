import type { APIRoute } from 'astro';
import { storeContext } from "../../../lib/storeContext";
import { getSettings } from "../../../lib/database";

export const POST: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const body = await request.json();
      const pincode: string | null = body.pincode || null;
      const variant_id: string | null = body.variant_id || null;
      const isQCommerceOnly: boolean = body.is_q_commerce_only === true;
      
      const settings = await getSettings();
      let isQCommerce = false;
      let finalEtaMin = settings.delivery_days_min || 3;
      let finalEtaMax = settings.delivery_days_max || 5;
      let eta = `${finalEtaMin}-${finalEtaMax} Days`;

      if (!pincode) {
        return new Response(JSON.stringify({ eta: eta, type: 'standard' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

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

      const { supabaseAdmin, isSupabase } = await import('../../../lib/database');
      
      if (isSupabase && supabaseAdmin) {
        // 1. Get all active locations for the store
        const { data: locations } = await supabaseAdmin
          .from('locations')
          .select('id, pincode, is_default, q_commerce_enabled, zone_type, delivery_pincodes, q_commerce_eta, latitude, longitude, delivery_radius_km')
          .eq('is_active', true);
        
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
                eta = loc.q_commerce_eta || '10-30 Mins';
                bestEtaMin = 0; // Highest priority
                break;
              } 
              // Latitude/Longitude calculation skipped for simplicity in promise API since we rely on pincode mostly for promise
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

          if (!isQCommerce) {
            if (isQCommerceOnly) {
              return new Response(JSON.stringify({ 
                eta: 'Undeliverable', 
                status: 'success', 
                type: 'standard' 
              }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (bestEtaMin !== 999) {
              eta = `${bestEtaMin}-${bestEtaMax} Days`;
            }
          }
        } else if (isQCommerceOnly) {
           return new Response(JSON.stringify({ 
              eta: 'Undeliverable', 
              status: 'success', 
              type: 'standard' 
           }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }

      return new Response(JSON.stringify({ 
        eta: isQCommerce ? eta : `Delivery in ${eta}`, 
        status: 'success', 
        type: isQCommerce ? 'q-commerce' : 'standard' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Delivery promise error:', error);
      return new Response(JSON.stringify({ error: 'Failed to calculate delivery promise' }), { status: 500 });
    }
  });
};

