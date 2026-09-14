import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .ilike('name', '%butterfly%');

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

checkProducts();
