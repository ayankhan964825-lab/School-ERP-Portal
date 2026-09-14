import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fetchAllProducts() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  const { data: products, error } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .select('id, name, description, category, variants')
    .eq('store_id', storeId);
    
  if (error) console.error(error);
  else console.log(JSON.stringify(products, null, 2));
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fetchAllProducts().catch(console.error);
});
