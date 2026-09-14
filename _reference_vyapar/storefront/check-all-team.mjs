import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of env.split('\n')) {
  if (line.startsWith('PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
}

async function run() {
  const storeUrl = `${supabaseUrl}/rest/v1/settings?select=store_id,store_name,pages_content`;
  const storeRes = await fetch(storeUrl, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const settings = await storeRes.json();
  
  for (const s of settings) {
    let pc = s.pages_content;
    if (typeof pc === 'string') {
      try { pc = JSON.parse(pc); } catch(e) {}
    }
    if (pc && typeof pc === 'object') {
      if (pc.team_members && pc.team_members.length > 0) {
        console.log(`STORE ${s.store_name} (${s.store_id}) has ${pc.team_members.length} team members.`);
      } else {
        console.log(`STORE ${s.store_name} (${s.store_id}) has 0 team members.`);
      }
    }
  }
}

run().catch(console.error);
