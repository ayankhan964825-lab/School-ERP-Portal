const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'storefront/.env' });

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncOldDefaults() {
  const oldContent = execSync('git show HEAD:storefront/src/pages/admin/store-details.astro').toString();
  
  const regex = /settings\.([a-zA-Z0-9_]+)\s*\|\|\s*(['"`])([\s\S]*?)\2/g;
  let match;
  const updates = {};
  
  while ((match = regex.exec(oldContent)) !== null) {
    const key = match[1];
    let value = match[3];
    // Revert "Store Name" to "The NutriDry" inside the text
    value = value.replace(/Store Name/g, 'The NutriDry');
    value = value.replace(/StoreName/g, 'TheNutriDry');
    value = value.replace(/store-name/gi, 'nutridry');
    updates[key] = value;
  }

  // Also extract from about.astro
  const oldAbout = execSync('git show HEAD:storefront/src/pages/about.astro').toString();
  const aboutRegex = /s\('([a-zA-Z0-9_]+)'(?:,\s*(['"`])([\s\S]*?)\2)?\)/g;
  while ((match = aboutRegex.exec(oldAbout)) !== null) {
    const key = match[1];
    let value = match[3];
    if (value && !updates[key]) {
      value = value.replace(/Store Name/g, 'The NutriDry');
      updates[key] = value;
    }
  }

  // explicit fixes for things we might miss
  updates.brand_name = 'The NutriDry';
  updates.admin_title = 'Al-Ahad';
  updates.logo_url = '/logo-nutridry.webp';
  updates.admin_logo_url = '/admin-icons/icon-96.png';
  updates.admin_favicon_url = '/admin-icons/icon-192.png';
  updates.favicon_url = '/icons/icon-192.png';
  
  // ensure we set the about hero defaults properly from the fallback they used before we scrubbed them
  if(!updates.about_hero_title) updates.about_hero_title = "Our Story";
  if(!updates.about_hero_subtitle) updates.about_hero_subtitle = "Nourishing Lives Naturally";
  if(!updates.about_hero_text) updates.about_hero_text = "The NutriDry was born from a passion for healthy, convenient nutrition.";
  
  // remove unneeded keys
  delete updates['redirect_domains'];
  delete updates['team_visibility'];
  
  console.log('Keys to update:', Object.keys(updates));
  
  const { error } = await supabase
    .from('settings')
    .update(updates)
    .eq('store_id', '00000000-0000-0000-0000-000000000002');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully injected old defaults into The NutriDry DB row!');
  }
}

syncOldDefaults();
