import { supabaseAdmin, getSettings } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function checkAdmin() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data, error } = await supabaseAdmin.from(TABLES.SETTINGS).select('pages_content').eq('store_id', storeId).single();
  console.log("DB Data:", JSON.stringify(data?.pages_content, null, 2));
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  checkAdmin().catch(console.error);
});
