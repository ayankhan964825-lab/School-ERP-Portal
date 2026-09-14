import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fetchPowders() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // Category 'Dehydrated Powders' is 91669510-ab46-40d9-91ba-37aab075b027
  const { data: products, error } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .select('id, name, description, category, variants')
    .eq('store_id', storeId)
    .eq('category', '91669510-ab46-40d9-91ba-37aab075b027');
    
  if (error) console.error(error);
  else console.log(JSON.stringify(products, null, 2));
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fetchPowders().catch(console.error);
});
