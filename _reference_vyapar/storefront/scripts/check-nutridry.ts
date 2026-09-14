import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';

async function check() {
  const storeId = '00000000-0000-0000-0000-000000000002';
  const { data } = await supabaseAdmin.from(TABLES.SETTINGS).select('pages_content').eq('id', storeId).single();
  console.log("NutriDry Data:", JSON.stringify(data?.pages_content, null, 2));
}

import { storeContext } from '../src/lib/storeContext.js';

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  check().catch(console.error);
});
