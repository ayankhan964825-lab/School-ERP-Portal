import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!);

async function dumpStaff() {
  const { data, error } = await supabaseAdmin
    .from('staff')
    .select('id, name, role, hierarchy_level, permissions');
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

dumpStaff();
