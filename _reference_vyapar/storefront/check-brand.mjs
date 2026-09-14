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
  const storeUrl = `${supabaseUrl}/rest/v1/stores?subdomain=eq.thenutridry&select=id`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const stores = await storeRes.json();
  const targetStore = stores[0];
  
  if (!targetStore) return console.log('Store not found');

  const settingsUrl = `${supabaseUrl}/rest/v1/settings?store_id=eq.${targetStore.id}&select=brand_name`;
  const settingsRes = await fetch(settingsUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const settings = await settingsRes.json();
  
  console.log('The NutriDry brand_name:', settings[0]?.brand_name);
}

run().catch(console.error);
