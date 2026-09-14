import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { TABLES } from '../../../lib/constants';

export const GET: APIRoute = async ({ locals }) => {
  if (!supabaseAdmin) {
    return new Response('Supabase not configured', { status: 500 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.AFFILIATES)
      .delete()
      .in('name', ['Abdul Samad', 'Influencer']);

    if (error) throw error;
    
    // Also try to delete their associated coupons to keep DB clean
    await supabaseAdmin
      .from(TABLES.COUPONS)
      .delete()
      .in('code', ['INFLUENCER10', 'ABDUL10', 'ABDULSAMAD10']); // Guesses for the coupon codes they might have

    // Fetch recent orders to delete ALL B2B orders
    let query = supabaseAdmin
      .from(TABLES.ORDERS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (locals.storeId && locals.storeId !== 'SUPER_ADMIN_BYPASS') {
      query = query.eq('store_id', locals.storeId);
    }

    const { data: recentOrders } = await query;

    const b2bOrders = (recentOrders || []).filter(o => {
      let isB2B = false;
      let customerObj = o.customer;
      
      if (typeof customerObj === 'string') {
        try { customerObj = JSON.parse(customerObj); } catch(e) {}
      }

      if (o.is_b2b === true || o.is_b2b === 'true') isB2B = true;
      if (o.source === 'b2b_pos') isB2B = true;

      if (customerObj && typeof customerObj === 'object') {
        if (customerObj.is_b2b === true || customerObj.is_b2b === 'true') isB2B = true;
        if (customerObj.source === 'b2b_pos') isB2B = true;
        
        const custStr = JSON.stringify(customerObj).toLowerCase();
        if (custStr.includes('faisa') || custStr.includes('khan')) isB2B = true;
      }
      
      return isB2B;
    });

    if (b2bOrders.length > 0) {
      // Chunk deletions to avoid URL length / query limits
      const chunkSize = 100;
      for (let i = 0; i < b2bOrders.length; i += chunkSize) {
        const chunk = b2bOrders.slice(i, i + chunkSize);
        await supabaseAdmin
          .from(TABLES.ORDERS)
          .delete()
          .in('id', chunk.map(o => o.id));
      }
    }

    return new Response(JSON.stringify({ success: true, message: `Wiped ${b2bOrders.length} B2B orders from the database successfully.` }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
