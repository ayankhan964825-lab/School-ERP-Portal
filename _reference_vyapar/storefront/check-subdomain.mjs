import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of env.split('\n')) {
  if (line.startsWith('PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
}

async function run() {
  const storeUrl = `${supabaseUrl}/rest/v1/stores?subdomain=eq.thenutridry`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const stores = await storeRes.json();
  
  console.log('Stores with subdomain thenutridry:');
  console.log(stores.map(s => ({ id: s.id, name: s.name, subdomain: s.subdomain })));
}

run().catch(console.error);
