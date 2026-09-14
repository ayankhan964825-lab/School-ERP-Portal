import * as db from './src/lib/database.ts';
async function run() {
  const count = await db.getStorefrontProductsCount('264023c7-1d2a-430c-bc3c-f4bbf949d06b');
  console.log('Total products:', count);
}
run();
