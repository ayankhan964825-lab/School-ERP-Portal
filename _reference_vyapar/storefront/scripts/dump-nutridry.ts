import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';
import fs from 'fs';

async function dumpNutriDry() {
  const storeId = '00000000-0000-0000-0000-000000000002'; // NutriDry
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('pages_content').eq('store_id', storeId).single();
  
  if (settings && settings.pages_content) {
    fs.writeFileSync('nutridry_dump.json', JSON.stringify(settings.pages_content, null, 2));
    console.log("Dumped to nutridry_dump.json");
  } else {
    console.log("No content found");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  dumpNutriDry().catch(console.error);
});
