import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of env.split('\n')) {
  if (line.startsWith('PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
}

async function run() {
  const storeUrl = `${supabaseUrl}/rest/v1/settings?select=store_id,pages_content`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const settings = await storeRes.json();
  
  let found = false;
  for (const s of settings) {
    let pc = s.pages_content;
    if (typeof pc === 'string') {
      try { pc = JSON.parse(pc); } catch(e) {}
    }
    if (pc && typeof pc === 'object') {
      if (pc.custom_domain && pc.custom_domain.includes('thenutridry')) {
        console.log(`Found custom_domain thenutridry in store: ${s.store_id}`);
        found = true;
      }
    }
  }
  if(!found) console.log('No other store found with thenutridry custom domain');
}

run().catch(console.error);
