const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envUrl = envContent.match(/PUBLIC_SUPABASE_URL=(.*)/)?.[1];
const envKey = envContent.match(/PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(envUrl, envKey);

async function run() {
  const { data: p } = await supabase.from('products').select('*').limit(1);
  console.log('Products Schema:', p ? Object.keys(p[0] || {}) : 'none');

  const { data: v } = await supabase.from('product_variants').select('*').limit(1);
  console.log('Variants Schema:', v ? Object.keys(v[0] || {}) : 'none');
}
run();
