import { getSettings, supabaseAdmin, isSupabase } from './database';

// Helper function moved to the top

export async function getEligibleLocations(storeId: string, customerAddress: any) {
  const { data: locations } = await supabaseAdmin
    .from('locations')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (!locations || locations.length === 0) return [];

  let eligibleLocations = locations;
  if (customerAddress) {
    const pc = (customerAddress.zip || customerAddress.pincode)?.toString().trim();
    const lat = customerAddress.latitude;
    const lng = customerAddress.longitude;
    
    const serviceableLocations = locations.filter((loc: any) => {
        if (!loc.q_commerce_enabled) return true; // Standard warehouse serves everywhere
        
        if (loc.zone_type === 'pincode' && loc.delivery_pincodes && Array.isArray(loc.delivery_pincodes)) {
            return loc.delivery_pincodes.includes(pc);
        } else if (loc.zone_type === 'radius' && loc.latitude && loc.longitude && lat && lng) {
            // Calculate Haversine distance
            const R = 6371; // Earth's radius in km
            const dLat = (lat - loc.latitude) * Math.PI / 180;
            const dLon = (lng - loc.longitude) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            
            if (distance <= (loc.delivery_radius_km || 0)) {
              return true;
            }
        }
        return false;
    });
    if (serviceableLocations.length > 0) {
        eligibleLocations = serviceableLocations;
    }
  }
  return eligibleLocations;
}

export async function processAndRouteOrder(
  cartItems: any[],
  customerAddress: any,
  storeId: string
) {
  // 1. Check Global Settings
  const settings = await getSettings();
  const isTrackingOn = (settings.global_inventory_tracking === true || settings.global_inventory_tracking === 'true');

  if (!isSupabase || !supabaseAdmin) {
    return { routedItems: cartItems, qcDowngraded: false };
  }

  // 2. Fetch eligible locations for the store and pincode
  const eligibleLocations = await getEligibleLocations(storeId, customerAddress);

  if (!eligibleLocations || eligibleLocations.length === 0) {
    // Fallback if absolutely no locations exist
    const { data: allLocations } = await supabaseAdmin.from('locations').select('*').eq('store_id', storeId).eq('is_default', true).limit(1);
    if(allLocations && allLocations.length > 0) {
        eligibleLocations.push(allLocations[0]);
    } else {
        return { routedItems: cartItems, qcDowngraded: false };
    }
  }

  // Find the default location
  const defaultLocation = eligibleLocations.find((l: any) => l.is_default) || eligibleLocations[0];
  
  // Check Rider Availability for QC Locations
  let qcDowngraded = false;
  if (isSupabase && supabaseAdmin) {
    const qcLocations = eligibleLocations.filter(l => l.q_commerce_enabled);
    if (qcLocations.length > 0) {
      const { data: riders } = await supabaseAdmin
        .from('riders')
        .select('id')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .eq('is_online', true)
        .limit(1);

      if (!riders || riders.length === 0) {
        qcDowngraded = true;
      }
    }
  }

  // Sort eligible locations to prefer QC first for fallback
  const sortedLocations = [...eligibleLocations].sort((a: any, b: any) => {
      const aQc = a.q_commerce_enabled ? 1 : 0;
      const bQc = b.q_commerce_enabled ? 1 : 0;
      return bQc - aQc;
  });
  
  const preferredLocation = sortedLocations[0] || defaultLocation;

  // 3. Process each item and route
  const routedItems = [];

  for (const item of cartItems) {
    // Resolve variant ID
    const resolvedVariantId = item.variant_id || (item.id && item.id.includes('-') ? item.id.split('-')[1] : null); 
    let requiredQty = item.quantity || 1;

    // If inventory tracking is disabled, bulk orders, or flash sales, just route to preferred location without checking stock
    if (
      !isTrackingOn || 
      (item.isB2B && (settings.bulk_order_inventory_tracking === false || settings.bulk_order_inventory_tracking === 'false')) || 
      item.isFlashSale
    ) {
      const isQc = (preferredLocation.q_commerce_enabled || false) && !item.is_standard_only;
      let target_eta = undefined;
      if (isQc) {
          if (qcDowngraded) {
              target_eta = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          } else {
              target_eta = new Date(Date.now() + (preferredLocation.q_commerce_sla_mins || 30) * 60000).toISOString();
          }
      }
      routedItems.push({ 
        ...item, 
        location_id: preferredLocation.id,
        q_commerce_enabled: isQc,
        eta_override: isQc ? (qcDowngraded ? 'Delivery in 12-24 hours' : (preferredLocation.q_commerce_eta || 'Delivery in 10-30 mins')) : undefined,
        target_eta
      });
      continue;
    }

    // Fetch available stock across all locations for this variant (ONLY IF TRACKING IS ON)
    const { data: stockLevels } = await supabaseAdmin
      .from('inventory')
      .select('location_id, available')
      .eq('variant_id', resolvedVariantId);
    
    if (!stockLevels || stockLevels.length === 0) {
        // No stock recorded anywhere, just attach to preferred location
        const isQc = preferredLocation.q_commerce_enabled || false;
        routedItems.push({ 
          ...item, 
          location_id: preferredLocation.id, 
          q_commerce_enabled: isQc,
          eta_override: isQc ? (qcDowngraded ? 'Delivery in 12-24 hours' : (preferredLocation.q_commerce_eta || 'Delivery in 10-30 mins')) : undefined
        });
        continue;
    }

    // Filter stock levels to only include eligible locations
    const eligibleLocationIds = eligibleLocations.map((l: any) => l.id);
    const filteredStockLevels = stockLevels.filter((s: any) => eligibleLocationIds.includes(s.location_id));

    if (filteredStockLevels.length === 0) {
        // None of the eligible locations have stock for this item
        // Fallback to default so it handles OOS errors correctly
        const isQc = (defaultLocation.q_commerce_enabled || false) && !item.is_standard_only;
        let target_eta = undefined;
        if (isQc) {
            if (qcDowngraded) {
                target_eta = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            } else {
                target_eta = new Date(Date.now() + (defaultLocation.q_commerce_sla_mins || 30) * 60000).toISOString();
            }
        }
        routedItems.push({ 
          ...item, 
          location_id: defaultLocation.id, 
          q_commerce_enabled: isQc,
          eta_override: isQc ? (qcDowngraded ? 'Delivery in 12-24 hours' : (defaultLocation.q_commerce_eta || 'Delivery in 10-30 mins')) : undefined,
          target_eta
        });
        continue;
    }

    // Sort locations by Q-commerce first, then by available stock (descending)
    filteredStockLevels.sort((a: any, b: any) => {
        const locA = eligibleLocations.find((l: any) => l.id === a.location_id);
        const locB = eligibleLocations.find((l: any) => l.id === b.location_id);
        const aQc = locA?.q_commerce_enabled ? 1 : 0;
        const bQc = locB?.q_commerce_enabled ? 1 : 0;
        
        if (aQc !== bQc) return bQc - aQc;
        return b.available - a.available;
    });

    // Split logic
    for (const stock of filteredStockLevels) {
      if (requiredQty <= 0) break;

      if (stock.available > 0) {
        const fulfillQty = Math.min(requiredQty, stock.available);
        const stockLoc = eligibleLocations.find((l: any) => l.id === stock.location_id);
        const isQc = (stockLoc?.q_commerce_enabled || false) && !item.is_standard_only;
        let target_eta = undefined;
        if (isQc) {
            if (qcDowngraded) {
                target_eta = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            } else {
                target_eta = new Date(Date.now() + (stockLoc.q_commerce_sla_mins || 30) * 60000).toISOString();
            }
        }
        routedItems.push({
          ...item,
          quantity: fulfillQty,
          location_id: stock.location_id,
          q_commerce_enabled: isQc,
          eta_override: isQc ? (qcDowngraded ? 'Delivery in 12-24 hours' : (stockLoc.q_commerce_eta || 'Delivery in 10-30 mins')) : undefined,
          target_eta
        });
        requiredQty -= fulfillQty;
      }
    }

    // If still requires qty (out of stock), attach remaining to default so RPC throws error or handles negative stock
    if (requiredQty > 0) {
      routedItems.push({
        ...item,
        quantity: requiredQty,
        location_id: defaultLocation.id,
        q_commerce_enabled: (defaultLocation.q_commerce_enabled || false) && !item.is_standard_only
      });
    }
  }

  return { routedItems, qcDowngraded };
}
