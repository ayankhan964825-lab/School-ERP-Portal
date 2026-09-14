import { supabaseAdmin, getSettings } from './database';

export async function runAutoAssign() {
  if (!supabaseAdmin) return { success: false, message: 'Database not configured' };

  try {
    const settings = await getSettings();
    const maxCapacity = settings?.max_rider_active_orders !== undefined ? Number(settings.max_rider_active_orders) : 5;

    // 1. Find all QC locations that have Auto-Assign enabled
    const { data: locations, error: locError } = await supabaseAdmin
      .from('locations')
      .select('id, store_id, latitude, longitude')
      .eq('is_active', true)
      .eq('q_commerce_enabled', true)
      .eq('auto_assign_riders', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (locError) throw locError;
    if (!locations || locations.length === 0) {
      return { success: true, message: 'No QC locations with auto-assign enabled' };
    }

    const storeIds = [...new Set(locations.map(l => l.store_id))];

    // 2. Find all QC orders for these stores that need a rider
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('order_id, store_id, status, delivery_type, items')
      .in('store_id', storeIds)
      .in('status', ['placed', 'confirmed', 'ready_for_pickup'])
      .eq('delivery_type', 'q_commerce_inhouse')
      .is('rider_id', null);

    if (ordersError) throw ordersError;
    
    if (!orders || orders.length === 0) {
      return { success: true, message: 'No unassigned orders found' };
    }

    let assignedCount = 0;

    // 3. For each order, find the nearest online rider to its fulfilled location
    for (const order of orders) {
      let orderLocId = null;
      if (order.items && Array.isArray(order.items)) {
         for (const item of order.items) {
           if (item.location_id) { orderLocId = item.location_id; break; }
         }
      }
      
      const location = orderLocId 
         ? locations.find(l => l.id === orderLocId) 
         : locations.find(l => l.store_id === order.store_id);

      if (!location) continue;

      // Find all online riders for this store
      const { data: riders, error: ridersError } = await supabaseAdmin
        .from('riders')
        .select('id, current_lat, current_lng, phone, name')
        .eq('store_id', order.store_id)
        .eq('status', 'active')
        .eq('is_online', true)
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null);

      if (ridersError || !riders || riders.length === 0) {
        continue; // No online riders available
      }

      // Fetch active orders for these riders to enforce capacity
      const { data: activeOrdersData } = await supabaseAdmin
        .from('orders')
        .select('rider_id')
        .in('rider_id', riders.map(r => r.id))
        .in('status', ['placed', 'confirmed', 'shipped', 'dispatched', 'out_for_delivery']);
      
      const riderOrderCounts: Record<string, number> = {};
      if (activeOrdersData) {
        for (const o of activeOrdersData) {
           if (o.rider_id) riderOrderCounts[o.rider_id] = (riderOrderCounts[o.rider_id] || 0) + 1;
        }
      }

      // Filter riders by max capacity
      const availableRiders = riders.filter(r => (riderOrderCounts[r.id] || 0) < maxCapacity);

      if (availableRiders.length === 0) {
        continue; // All online riders are at maximum capacity
      }

      // Calculate distance for all available riders using Haversine in JS
      let nearestRider = null;
      let minDistance = 999999;

      for (const rider of availableRiders) {
        const d = calculateHaversineDistance(location.latitude, location.longitude, rider.current_lat, rider.current_lng);
        if (d < minDistance) {
          minDistance = d;
          nearestRider = rider;
        }
      }

      // Threshold: only assign if rider is within 15 km
      if (nearestRider && minDistance <= 15) {
        // Atomic guard: only assign if rider_id is still null (prevents double-assignment race)
        const { data: updated } = await supabaseAdmin
          .from('orders')
          .update({ rider_id: nearestRider.id, updated_at: new Date().toISOString() })
          .eq('order_id', order.order_id)
          .is('rider_id', null)
          .select('order_id');

        if (!updated || updated.length === 0) continue; // Already assigned by another process
          
        await supabaseAdmin
          .from('fulfillments')
          .update({ 
            rider_status: 'assigned', 
            delivery_type: 'q_commerce_inhouse',
            rider_phone: nearestRider.phone,
            rider_name: nearestRider.name
          })
          .eq('order_id', order.order_id);

        assignedCount++;
        // Fix: Explicitly increment in-memory counter to prevent capacity breach on next iteration
        riderOrderCounts[nearestRider.id] = (riderOrderCounts[nearestRider.id] || 0) + 1;
      }
    }

    return { success: true, assignedCount };

  } catch (error: any) {
    console.error('Auto-assign logic error:', error);
    return { success: false, error: error.message };
  }
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
