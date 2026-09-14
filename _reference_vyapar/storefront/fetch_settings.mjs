import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('store_id', '00000000-0000-0000-0000-000000000002');
  
  if (error) {
    console.error(error);
  } else {
    const settings = data[0];
    const seoSettings = {};
    for (const key in settings) {
      if (key.startsWith('seo_')) {
        seoSettings[key] = settings[key];
      }
    }
    console.log(JSON.stringify(seoSettings, null, 2));
  }
}
run();
