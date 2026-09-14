import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of env.split('\n')) {
  if (line.startsWith('PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
}

async function run() {
  const storeUrl = `${supabaseUrl}/rest/v1/settings?store_id=eq.00000000-0000-0000-0000-000000000002&select=*`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const settings = await storeRes.json();
  
  console.log('The NutriDry Settings Dump:');
  console.log('brand_name:', settings[0]?.brand_name);
  console.log('admin_title:', settings[0]?.admin_title);
  console.log('pages_content.super_admin_custom_name:', settings[0]?.pages_content?.super_admin_custom_name);
  console.log('store_name:', settings[0]?.store_name);
}

run().catch(console.error);
