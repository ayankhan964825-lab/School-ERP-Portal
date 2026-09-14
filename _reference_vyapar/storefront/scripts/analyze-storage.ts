import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';

async function analyzeStorage() {
  const targetBucket = 'products';
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // 1. Fetch all files in the store's folder
  const { data: storeObjects, error: objErr } = await supabaseAdmin.storage.from(targetBucket).list(storeId, {
    limit: 1000,
  });
  
  if (objErr) {
    console.error("Error fetching storage objects:", objErr);
    return;
  }
  
  const allStorageFiles = storeObjects.filter(o => o.id !== null).map(o => `${storeId}/${o.name}`);
  console.log(`Found ${allStorageFiles.length} files in storage folder ${storeId}`);
  
  // 2. Fetch all linked images from database for this store
  let linkedImages = new Set<string>();
  
  // Products
  const { data: products } = await supabaseAdmin.from(TABLES.PRODUCTS).select('image, images').eq('store_id', storeId);
  products?.forEach(p => {
    if (p.image) linkedImages.add(p.image);
    if (p.images && Array.isArray(p.images)) {
      p.images.forEach(img => linkedImages.add(img));
    }
  });
  
  // Variants
  const { data: variants } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).select('image').eq('store_id', storeId);
  variants?.forEach(v => {
    if (v.image) linkedImages.add(v.image);
  });
  
  // Categories
  const { data: categories } = await supabaseAdmin.from(TABLES.CATEGORIES).select('image').eq('store_id', storeId);
  categories?.forEach(c => {
    if (c.image) linkedImages.add(c.image);
  });
  
  // Settings / pages_content
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('pages_content').eq('store_id', storeId).single();
  if (settings && settings.pages_content) {
     const pcStr = JSON.stringify(settings.pages_content);
     // regex to find things looking like images/ or e6b...
     const matches = pcStr.match(/e6b1560c-13e7-4abb-b84b-a6a6a760a5e0\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+/g);
     if (matches) {
       matches.forEach(m => linkedImages.add(m));
     }
  }

  // 3. Find unlinked files
  const unlinkedFiles = allStorageFiles.filter(file => {
    // Check if any linked image contains this filename
    for (const linked of linkedImages) {
      if (linked && linked.includes(file)) return false;
    }
    return true;
  });
  
  console.log(`Found ${linkedImages.size} total linked images in DB.`);
  console.log(`\n--- UNLINKED FILES (${unlinkedFiles.length}) ---`);
  unlinkedFiles.forEach(f => console.log(f));
}

import { storeContext } from '../src/lib/storeContext.js';

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  analyzeStorage().catch(console.error);
});
