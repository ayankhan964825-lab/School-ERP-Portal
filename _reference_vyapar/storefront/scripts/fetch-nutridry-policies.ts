import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fetchNutriDryPages() {
  const storeId = '00000000-0000-0000-0000-000000000002';
  const { data: pages } = await supabaseAdmin
    .from(TABLES.PAGES)
    .select('slug, title, content, is_published')
    .eq('store_id', storeId);
    
  if (pages) {
    console.log(JSON.stringify(pages, null, 2));
  } else {
    console.log("No pages found.");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fetchNutriDryPages().catch(console.error);
});
