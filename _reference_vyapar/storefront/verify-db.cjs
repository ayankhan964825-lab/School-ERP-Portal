const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envUrl = envContent.match(/PUBLIC_SUPABASE_URL=(.*)/)?.[1];
const envKey = envContent.match(/PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(envUrl, envKey);

async function run() {
  const { data: settings } = await supabase.from('settings').select('pages_content').eq('store_id', 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0').single();
  let pc = settings.pages_content;
  if (typeof pc === 'string') pc = JSON.parse(pc);
  console.log('home_story_text:', pc.home_story_text);
  console.log('about_hero_title:', pc.about_hero_title);
}
run();
