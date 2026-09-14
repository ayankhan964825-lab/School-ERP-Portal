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
  const storeUrl = `${supabaseUrl}/rest/v1/settings?select=store_id,pages_content`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const settings = await storeRes.json();
  
  settings.forEach(s => {
    let pc = s.pages_content;
    if (typeof pc === 'string') {
      try { pc = JSON.parse(pc); } catch(e) {}
    }
    if (pc && pc.admin_title) {
      console.log(`Store ${s.store_id} has admin_title:`, pc.admin_title);
    }
  });
}

run().catch(console.error);
