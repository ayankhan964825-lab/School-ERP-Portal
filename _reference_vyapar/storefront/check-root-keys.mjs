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
  const storeUrl = `${supabaseUrl}/rest/v1/settings?store_id=eq.00000000-0000-0000-0000-000000000002`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const settings = await storeRes.json();
  
  if(settings && settings.length > 0) {
    const s = settings[0];
    const pcKeys = s.pages_content ? Object.keys(s.pages_content) : [];
    console.log('--- ROOT KEYS ---');
    for (const key of Object.keys(s)) {
      if (key !== 'pages_content') {
        console.log(`${key}: ${s[key]}`);
      }
    }
    console.log('--- PAGES CONTENT KEYS ---');
    console.log(pcKeys.join(', '));
  }
}

run().catch(console.error);
