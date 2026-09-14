import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { config } from 'dotenv';
config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const pagesDir = path.join(__dirname, '..', 'temp_old_repo', 'storefront', 'src', 'pages');

const extractedFallbacks = {};

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // We need to match: s('KEY', `VALUE`) or s('KEY', 'VALUE') or s('KEY', "VALUE")
  // Since we are reading files, we can just use a RegExp that is careful.
  const regex = /s\(\s*'([^']+)'\s*,\s*(`[\s\S]*?`|'[\s\S]*?'|"[\s\S]*?")\s*\)/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    let val = match[2];
    val = val.substring(1, val.length - 1); // remove outer quotes
    extractedFallbacks[key] = val;
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.astro')) {
      processFile(fullPath);
    }
  }
}

async function main() {
  processDirectory(pagesDir);
  console.log(`Extracted ${Object.keys(extractedFallbacks).length} fallbacks!`);
  
  const storeId = '00000000-0000-0000-0000-000000000002'; // NutriDry
  const { data: current, error: fetchError } = await supabaseAdmin.from('settings').select('*').eq('store_id', storeId).limit(1).single();
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error("Error fetching settings:", fetchError);
    return;
  }
  
  const existingPagesContent = current?.pages_content || {};
  
  // Only insert strings that belong to page content
  const updatedPagesContent = { ...existingPagesContent, ...extractedFallbacks };
  
  const supabasePayload = {
    pages_content: updatedPagesContent
  };
  
  if (current) {
    const { error } = await supabaseAdmin.from('settings').update(supabasePayload).eq('store_id', storeId);
    if (error) console.error("Update Error:", error);
    else console.log("Success! All original fallbacks injected.");
  }
}

main().catch(console.error);
