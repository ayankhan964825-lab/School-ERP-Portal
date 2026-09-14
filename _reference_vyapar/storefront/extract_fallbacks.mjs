import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const storeId = '00000000-0000-0000-0000-000000000002'; // NutriDry
  
  // Get all astro files from the commit
  const filesOutput = execSync('git ls-tree -r --name-only 379f1c16bd624af81e1488ec80c70d49172efe49 storefront/src/pages').toString();
  const files = filesOutput.split('\n').filter(f => f.endsWith('.astro'));
  
  const extractedFallbacks = {};
  
  // Regex to match s('key', `fallback`) or s('key', 'fallback') or s('key', "fallback")
  // Since we might have multiline strings, we need a robust regex or we can just parse it carefully.
  // We can use a simpler approach: match s('KEY', and then extract what follows until the closing bracket if it's simple,
  // but template literals `...` can be multi-line.
  
  for (const file of files) {
    try {
      const content = execSync(`git show 379f1c16bd624af81e1488ec80c70d49172efe49:${file}`).toString();
      
      // regex to find s('key', `...`) or s('key', '...')
      // We will match s(' followed by the key, followed by ', then the value which could be wrapped in ` or ' or "
      const regex = /s\(\s*'([^']+)'\s*,\s*(`[\s\S]*?`|'[\s\S]*?'|"[\s\S]*?")\s*\)/g;
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        let val = match[2];
        // Strip the surrounding quotes (` or ' or ")
        val = val.substring(1, val.length - 1);
        extractedFallbacks[key] = val;
      }
    } catch (e) {
      console.log(`Could not process ${file}`);
    }
  }
  
  console.log(`Extracted ${Object.keys(extractedFallbacks).length} fallbacks!`);
  
  // Now fetch current DB and merge
  const { data: current, error: fetchError } = await supabaseAdmin.from('settings').select('*').eq('store_id', storeId).limit(1).single();
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error("Error fetching settings:", fetchError);
    return;
  }
  
  const existingPagesContent = current?.pages_content || {};
  
  // Only insert if the key doesn't exist, OR we want to overwrite it because our previous manual injections might have been incomplete.
  // Actually, we should probably overwrite to ensure the original NutriDry text is restored exactly as it was.
  // Let's merge them in, giving precedence to the extracted fallbacks!
  const updatedPagesContent = { ...existingPagesContent, ...extractedFallbacks };
  
  const supabasePayload = {
    pages_content: updatedPagesContent
  };
  
  if (current) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n[WARNING] This will overwrite settings for store: ${storeId}`);
    rl.question('Are you sure you want to proceed? (yes/no): ', async (answer) => {
      rl.close();
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('Operation cancelled by user.');
        return;
      }
      
      console.log('Proceeding with update...');
      const { error } = await supabaseAdmin.from('settings').update(supabasePayload).eq('store_id', storeId);
      if (error) console.error("Update Error:", error);
      else console.log("Success! All original fallbacks injected.");
    });
  }
}

main().catch(console.error);
