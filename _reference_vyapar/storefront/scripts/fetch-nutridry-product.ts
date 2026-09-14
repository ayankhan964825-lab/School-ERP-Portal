import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';

async function fetchNutriDryProduct() {
  const storeId = '00000000-0000-0000-0000-000000000002';
  const { data: products } = await supabaseAdmin.from(TABLES.PRODUCTS).select('*').eq('store_id', storeId).limit(2);
  console.log(JSON.stringify(products, null, 2));
}

import { storeContext } from '../src/lib/storeContext.js';
storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fetchNutriDryProduct().catch(console.error);
});
