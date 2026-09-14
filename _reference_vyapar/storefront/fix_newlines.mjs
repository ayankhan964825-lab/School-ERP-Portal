import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: __dirname + '/.env' });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function fixNewlines() {
  const storeId = '00000000-0000-0000-0000-000000000002'; // NutriDry

  const { data: current, error: fetchError } = await supabaseAdmin.from('settings').select('*').eq('store_id', storeId).limit(1).single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error("Error fetching settings:", fetchError);
    return;
  }

  const existingPagesContent = current?.pages_content || {};
  const updatedPagesContent = {};

  for (const [key, value] of Object.entries(existingPagesContent)) {
    if (typeof value === 'string') {
      // Replace literal '\n' with actual newline
      updatedPagesContent[key] = value.replace(/\\n/g, '\n');
    } else {
      updatedPagesContent[key] = value;
    }
  }

  // Check footer_description and contact_address for incorrect data
  // The user says footer logo ke niche ki details mein galat data hai
  // From the user's input: "12424014001111 ye wala fssai mein nhi rahega Parent Company Name: "AL-AHAD TRADING COMPANY" nhi daalna hai"
  // Let's ensure parent_company_name is blank and fssai is correct
  updatedPagesContent['parent_company_name'] = '';
  updatedPagesContent['fssai'] = '22725747000233'; // Only this FSSAI

  // Fix footer description back to what might be expected if it's wrong, 
  // actually wait, let's just make sure the `footer_description` is right. 
  // Let's check what the old commit b945163c7b883d086b922d3251e2fbf83a137882 had.
  // We'll leave footer_description alone unless we know what it should be. 

  const supabasePayload = {
    pages_content: updatedPagesContent
  };

  const { error } = await supabaseAdmin.from('settings').update(supabasePayload).eq('store_id', storeId);
  if (error) console.error("Update Error:", error);
  else console.log("Success! Newlines and specific details fixed.");
}

fixNewlines().catch(console.error);
