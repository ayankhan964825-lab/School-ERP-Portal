import { config } from 'dotenv';
config();
import { rawSupabaseAdmin } from './src/lib/database.ts';

async function run() {
  const { data, error } = await rawSupabaseAdmin.from('settings').select('store_id, brand_name, pages_content');
  if (error) console.error(error);
  
  const mapped = data?.map(d => {
    let pc = d.pages_content;
    if (typeof pc === 'string') pc = JSON.parse(pc);
    return {
      store: d.store_id,
      brand: d.brand_name,
      favicon_url: pc?.favicon_url,
      brand_favicon: pc?.brand_favicon,
      admin_favicon: pc?.admin_favicon_url
    };
  });
  console.log('Favicons inside pages_content:', mapped);
}
run();
