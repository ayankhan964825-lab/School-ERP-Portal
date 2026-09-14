import * as db from './src/lib/database.ts';

globalThis.import = { meta: { env: { PUBLIC_CLOUDFLARE_CDN_URL: 'https://cdn.vyaparpe.com' } } } as any;

async function check() {
  const storeId = '264023c7-1d2a-430c-bc3c-f4bbf949d06b';
  const cats = await db.getCategories(storeId);
  const found = cats.filter(c => c.name.toLowerCase().includes('product') || c.slug.includes('product'));
  console.log('Categories found:', found);
}
check().catch(console.error);
