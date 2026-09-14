import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('run_sql', { 
    query: `
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'get_staff_descendants';
    `
  });
  console.log('Definition:', data || error);
}

test();
