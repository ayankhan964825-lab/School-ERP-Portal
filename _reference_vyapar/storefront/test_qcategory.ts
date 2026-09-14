import * as db from './src/lib/database.ts';

// polyfill for testing
globalThis.import = { meta: { env: { PUBLIC_CLOUDFLARE_CDN_URL: 'https://cdn.vyaparpe.com' } } } as any;

async function test() {
  const forceStoreId = '264023c7-1d2a-430c-bc3c-f4bbf949d06b'; // nutridry
  
  // What qcommerce-category does:
  const [allProductsRaw, dbCategoryTree, dbCategoriesFlat, settings] = await Promise.all([
    db.getStorefrontProducts(forceStoreId, undefined),
    db.getCategoryTree(forceStoreId),
    db.getCategories(forceStoreId),
    db.getSettings(forceStoreId),
  ]);

  console.log('allProductsRaw count:', allProductsRaw.length);
  
  if (allProductsRaw.length > 0) {
    console.log('Sample product variants:', allProductsRaw[0].variants?.length);
  }
}

test().catch(console.error);
