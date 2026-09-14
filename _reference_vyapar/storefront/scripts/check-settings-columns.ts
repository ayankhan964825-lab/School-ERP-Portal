import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkCols() {
  const { data, error } = await s.from('settings').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('ALL COLUMNS IN SETTINGS TABLE:');
    const cols = Object.keys(data[0]);
    console.log(cols);
    console.log('\nDoes website_theme exist as top-level column?:', cols.includes('website_theme'));
    console.log('Does website_design exist as top-level column?:', cols.includes('website_design'));
    console.log('Does website_configuration exist as top-level column?:', cols.includes('website_configuration'));

    console.log('\nSample row values for website_theme / design / config:');
    console.log('website_theme:', data[0].website_theme);
    console.log('website_design:', data[0].website_design);
    console.log('website_configuration:', data[0].website_configuration);
  }
}

checkCols();
