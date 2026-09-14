import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function auditProducts() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  const { data: products, error } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .select('id, name, description, long_description, bullet_points')
    .eq('store_id', storeId);
    
  if (error || !products) {
    console.error("Error fetching products:", error);
    return;
  }
  
  // Filter for combos and butterfly pea flower to audit
  const targetProducts = products.filter(p => 
    p.name.toLowerCase().includes('combo') || 
    p.name.toLowerCase().includes('butterfly') ||
    !p.long_description || 
    !p.bullet_points
  );
  
  console.log(`Found ${targetProducts.length} products needing audit.\n`);
  
  for (const p of targetProducts) {
    console.log(`--- PRODUCT: ${p.name} ---`);
    console.log(`ID: ${p.id}`);
    console.log(`Short Desc: ${p.description ? 'EXISTS' : 'MISSING'}`);
    console.log(`Long Desc: ${p.long_description ? 'EXISTS' : 'MISSING'}`);
    console.log(`Bullet Points: ${p.bullet_points ? JSON.stringify(p.bullet_points) : 'MISSING'}`);
    console.log('\n');
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  auditProducts().catch(console.error);
});
