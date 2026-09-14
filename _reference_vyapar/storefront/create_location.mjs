import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const storeId = '83890238-437a-4c0c-9c6a-8a23c1fb25c5';

async function run() {
  const newLocation = {
    store_id: storeId,
    name: 'Main Warehouse',
    is_default: true,
    is_active: true,
    address_line1: 'CJ Protein Snacks HQ',
    address_line2: '123 Health Ave',
    city: 'Mumbai',
    state: 'MH',
    pincode: '400001',
    country: 'India',
    q_commerce_enabled: false,
    zone_type: 'none',
    contact_name: 'CJ Admin',
    contact_phone: '+91 89717 35970',
    contact_email: 'helpme@cjproteinsnack.in',
    auto_assign_riders: false
  };

  const { data, error } = await supabase.from('locations').insert(newLocation).select();
  if (error) {
    console.error("Error creating location:", error);
  } else {
    console.log("Created Location:", data);
  }
}

run();
