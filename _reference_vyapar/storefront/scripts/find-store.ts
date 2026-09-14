import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!);

async function findStore() {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('id, store_name, brand_name, url_slug, subdomain')
    .ilike('brand_name', '%Treasure%');
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

findStore();
