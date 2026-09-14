import { config } from 'dotenv';
config();

import { supabaseAdmin, isSupabase } from './src/lib/database';
import { storeContext } from './src/lib/storeContext';

async function main() {
  if (!isSupabase || !supabaseAdmin) {
    console.log('No supabase connection available.');
    process.exit(1);
  }

  await storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, async () => {
    console.log('Deleting all from orders table...');
    const { error: err1 } = await supabaseAdmin.from('orders').delete().neq('order_id', 'dummy');
    if (err1) console.error('Error deleting orders:', err1);
    
    console.log('Deleting all from master_orders table...');
    const { error: err2 } = await supabaseAdmin.from('master_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.error('Error deleting master_orders:', err2);
    
    console.log('Orders deletion complete!');
  });
  
  process.exit(0);
}

main();
