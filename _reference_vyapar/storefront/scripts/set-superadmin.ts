import { supabaseAdmin, getSettings } from '../src/lib/database.js';
import { hashPassword } from '../src/lib/permissions.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function setSuperAdmin() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  console.log('Fetching settings for store:', storeId);
  const { data: currentSettings, error: fetchErr } = await supabaseAdmin.from(TABLES.SETTINGS).select('*').eq('store_id', storeId).single();
  
  if (fetchErr || !currentSettings) {
    console.error('Failed to fetch settings', fetchErr);
    return;
  }
  
  let pc = currentSettings.pages_content;
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch (e) { pc = {}; }
  }
  if (!pc || typeof pc !== 'object') pc = {};
  
  const email = 'faisal.khan1192519@gmail.com';
  const passwordHash = 'ff9d64a96aeae864e026ab98b7a0108dc8a5ef08a658aa31f976155efc6890a8';
  
  pc.super_admin_custom_email = email;
  pc.super_admin_custom_password_hash = passwordHash;
  pc.super_admin_custom_name = 'Faisal Khan';
  
  console.log('Updating settings with super admin details...');
  const { error: updateErr } = await supabaseAdmin.from(TABLES.SETTINGS).update({ pages_content: pc }).eq('store_id', storeId);
  
  if (updateErr) {
    console.error('Update error:', updateErr);
  } else {
    console.log('Superadmin set successfully!');
    console.log('Email:', email);
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  setSuperAdmin().catch(console.error);
});
