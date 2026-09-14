import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgfikdhcudyixwbwlcuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZmlrZGhjdWR5aXh3YndsY3VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI4MjE2NiwiZXhwIjoyMDk0ODU4MTY2fQ.296E1TlnGMs-tYClD6eq83HPHLkL9WBPsfw36HCKqgM';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Connecting to LIVE Database...");

  const storeId = '00000000-0000-0000-0000-000000000002';
  
  // Fetch ALL orders for this store to find B2B ones
  let allOrders = [];
  let page = 0;
  const pageSize = 1000;
  
  console.log(`Fetching orders for store ${storeId}...`);
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('order_id, customer')
      .eq('store_id', storeId)
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error("Error fetching orders:", error);
      break;
    }
    
    if (!data || data.length === 0) break;
    allOrders = allOrders.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`Fetched ${allOrders.length} total orders for Nutridry.`);

  const b2bOrders = allOrders.filter(o => {
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

  console.log(`Found ${b2bOrders.length} B2B orders to delete.`);

  if (b2bOrders.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < b2bOrders.length; i += chunkSize) {
      const chunk = b2bOrders.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from('orders')
        .delete()
        .in('order_id', chunk.map(o => o.order_id));
        
      if (error) {
        console.error("Error deleting chunk:", error);
      } else {
        console.log(`Deleted chunk of ${chunk.length} orders.`);
      }
    }
    console.log("Successfully wiped all B2B orders!");
  } else {
    console.log("No B2B orders found in the live DB to delete.");
  }
}

run();
