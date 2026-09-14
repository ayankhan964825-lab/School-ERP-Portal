import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: files, error } = await supabase.storage.from('products').list('videos');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Files in products/videos:', files.map(f => f.name));
  }
}
check();
