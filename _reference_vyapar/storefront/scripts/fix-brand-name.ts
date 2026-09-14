import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fixBrandName() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('id').eq('store_id', storeId).single();
  
  if (settings) {
    await supabaseAdmin.from(TABLES.SETTINGS).update({
      brand_name: "Treasure Flavours"
    }).eq('id', settings.id);
    console.log("Brand name fixed!");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fixBrandName().catch(console.error);
});
