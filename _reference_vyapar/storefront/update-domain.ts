import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const customDomain = 'treasureflavours.com';
  
  // Update stores table
  const { error: storeErr } = await supabase
    .from('stores')
    .update({ custom_domain: customDomain })
    .eq('id', storeId);
    
  if (storeErr) {
      console.error('Error updating stores:', storeErr);
  } else {
      console.log('Stores table updated successfully.');
  }

  // Update settings table pages_content
  const { data: settings } = await supabase.from('settings').select('id, pages_content').eq('store_id', storeId).single();
  if (settings) {
      const pc = settings.pages_content || {};
      pc.custom_domain = customDomain;
      pc.custom_domain_status = 'active'; // or pending
      
      const { error: setErr } = await supabase.from('settings').update({ pages_content: pc }).eq('id', settings.id);
      if (setErr) console.error('Error updating settings:', setErr);
      else console.log('Settings pages_content updated successfully.');
  }
}

run();
