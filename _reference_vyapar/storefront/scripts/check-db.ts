import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkDB() {
  const storeId = '00000000-0000-0000-0000-000000000002';
  const { data, error } = await supabaseAdmin.from('settings').select('*').eq('store_id', storeId).single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  let pc = data.pages_content;
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch (e) {}
  }
  
  console.log('--- DATABASE STATE ---');
  console.log('website_theme:', pc?.website_theme);
  console.log('website_design:', pc?.website_design);
  console.log('website_configuration:', pc?.website_configuration);
}

checkDB();
