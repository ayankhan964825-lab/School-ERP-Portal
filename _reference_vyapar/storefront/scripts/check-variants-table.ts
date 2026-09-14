import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function checkVariants() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data: variants, error } = await supabaseAdmin
    .from(TABLES.PRODUCT_VARIANTS)
    .select('*')
    .eq('store_id', storeId)
    .limit(2);
    
  if (error) console.error(error);
  else console.log(variants);
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  checkVariants().catch(console.error);
});
