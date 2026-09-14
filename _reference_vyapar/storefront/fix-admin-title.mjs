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
  const storeUrl = `${supabaseUrl}/rest/v1/settings?store_id=eq.00000000-0000-0000-0000-000000000002&select=pages_content`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const settings = await storeRes.json();
  
  let pc = settings[0]?.pages_content;
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch(e) {}
  }
  
  if (pc) {
    pc.admin_title = "The NutriDry";
    
    // Also let's clean up the malformed root team_members column just in case
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/settings?store_id=eq.00000000-0000-0000-0000-000000000002`, {
      method: 'PATCH',
      headers: { 
        'apikey': supabaseKey, 
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ pages_content: pc })
    });
    console.log('Update status:', updateRes.status);
  }
}

run().catch(console.error);
