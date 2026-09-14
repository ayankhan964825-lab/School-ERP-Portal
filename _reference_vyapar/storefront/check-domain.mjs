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
  const storeUrl = `${supabaseUrl}/rest/v1/stores?custom_domain=eq.thenutridry.com&select=id,name,subdomain`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const stores = await storeRes.json();
  
  console.log('Stores mapped to thenutridry.com:', stores);
}

run().catch(console.error);
