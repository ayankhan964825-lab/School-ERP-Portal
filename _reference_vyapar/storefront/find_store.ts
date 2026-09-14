import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgfikdhcudyixwbwlcuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZmlrZGhjdWR5aXh3YndsY3VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI4MjE2NiwiZXhwIjoyMDk0ODU4MTY2fQ.296E1TlnGMs-tYClD6eq83HPHLkL9WBPsfw36HCKqgM';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('stores').select('id, name, subdomain');
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
