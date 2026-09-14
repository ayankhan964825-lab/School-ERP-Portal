import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  const storeId = '00000000-0000-0000-0000-000000000002';
  const payload = {
    name: 'Test Milestone',
    tiers: [{"target":1000,"discount":10,"message":"Hello","free_gifts":[]}],
    is_active: true,
    store_id: storeId
  };

  // Deactivate others
  const { error: e1 } = await supabase.from('milestone_offers').update({ is_active: false }).eq('store_id', storeId).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deactivate result:", e1);

  const { data, error } = await supabase.from('milestone_offers').insert([payload]).select();
  console.log("Insert Result:", data, error);
}

test();
