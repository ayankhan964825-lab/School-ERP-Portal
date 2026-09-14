import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function checkCategories() {
  const { data: categories, error } = await supabaseAdmin.from(TABLES.CATEGORIES).select('*').limit(1);
  if (error) console.error(error);
  else console.log(categories);
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  checkCategories().catch(console.error);
});
