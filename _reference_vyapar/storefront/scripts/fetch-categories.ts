import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fetchCategories() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data: categories, error } = await supabaseAdmin.from(TABLES.CATEGORIES).select('id, name, slug').eq('store_id', storeId);
  if (error) console.error(error);
  else console.log(JSON.stringify(categories, null, 2));
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fetchCategories().catch(console.error);
});
