import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function checkRatings() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data: products } = await supabaseAdmin.from(TABLES.PRODUCTS).select('*').eq('store_id', storeId).limit(1);
  
  if (!products || products.length === 0) {
    console.log("No products found");
    return;
  }

  const p = products[0];
  console.log("Product Keys:", Object.keys(p));
  console.log("Rating fields:");
  Object.keys(p).filter(k => k.toLowerCase().includes('rat') || k.toLowerCase().includes('rev') || k.toLowerCase().includes('count')).forEach(k => {
    console.log(`${k}: ${p[k]}`);
  });
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  checkRatings().catch(console.error);
});
