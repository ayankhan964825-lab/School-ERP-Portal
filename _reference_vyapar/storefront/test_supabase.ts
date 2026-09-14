import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const storeId = '264023c7-1d2a-430c-bc3c-f4bbf949d06b'; // nutridry
  
  // Test 1: get count with the .or condition
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('store_id', storeId)
    .or('is_q_commerce_only.eq.false,is_q_commerce_only.is.null');
    
  console.log('Count with .or():', count, error);

  // Test 2: get count without .or condition
  const { count: countAll, error: errorAll } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('store_id', storeId);
    
  console.log('Count ALL:', countAll, errorAll);
  
  // Test 3: check categories
  const { data: cats } = await supabase.from('categories').select('slug, name').eq('store_id', storeId);
  console.log('Categories:', cats?.length);
}

test().catch(console.error);
