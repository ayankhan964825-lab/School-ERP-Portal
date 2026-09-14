import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'storefront/.env' });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching activity logs...');
  const { data, error } = await supabase.from('activity_logs').select('*').limit(5);
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS, fetched', data?.length, 'rows');
  }
}

test();
