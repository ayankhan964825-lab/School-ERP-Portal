import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const storesToDelete = ['Free Test Store', 'Test Store', 'Ganesh'];
  
  for (const storeName of storesToDelete) {
    console.log(`Deleting store: ${storeName}`);
    
    // Find the store ID
    const { data: store, error: findError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('name', storeName)
      .single();
      
    if (findError) {
      console.log(`Could not find store ${storeName}:`, findError.message);
      continue;
    }
    
    if (store) {
      console.log(`Found store ID: ${store.id}. Proceeding to delete.`);
      const { error: deleteError } = await supabase
        .from('stores')
        .delete()
        .eq('id', store.id);
        
      if (deleteError) {
        console.error(`Failed to delete ${storeName}:`, deleteError);
      } else {
        console.log(`Successfully deleted ${storeName}`);
      }
    }
  }
}

run();
