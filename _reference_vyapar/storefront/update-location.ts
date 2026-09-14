import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const storeId = process.env.VITE_STORE_ID || '00000000-0000-0000-0000-000000000002';
  
  // get store ID from settings
  const { data: settings } = await supabase.from('settings').select('store_id, contact_phone').limit(1);
  const actualStoreId = settings?.[0]?.store_id || storeId;
  const phone = settings?.[0]?.contact_phone || '9148229076';

  const addressString = "No.5 KBar Road, Austin Town Layout, Neelasandra";
  const city = "Bengaluru";
  const state = "Karnataka";
  const pincode = "560047";
  const country = "India";
  const name = "Treasure Flavours HQ";
  const contactPerson = "Store Manager";
  
  // check if location exists
  const { data: existing } = await supabase.from('locations').select('*').eq('store_id', actualStoreId);
  
  if (existing && existing.length > 0) {
    const loc = existing[0];
    await supabase.from('locations').update({
      address: addressString,
      city,
      state,
      pincode,
      country,
      name,
      contact_person: contactPerson,
      phone
    }).eq('id', loc.id);
    console.log("Updated existing location with correct address.");
  } else {
    await supabase.from('locations').insert({
      store_id: actualStoreId,
      address: addressString,
      city,
      state,
      pincode,
      country,
      name,
      contact_person: contactPerson,
      phone,
      is_default: true,
      is_active: true
    });
    console.log("Inserted new location with correct address.");
  }
}

run();
