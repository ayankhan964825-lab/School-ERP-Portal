import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!);
import { TABLES } from '../src/lib/constants.js';
async function fixRatingStars() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  const { data: products, error: fetchErr } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .select('id, name')
    .eq('store_id', storeId);
    
  if (fetchErr || !products || products.length === 0) {
    console.error("Error or no products found:", fetchErr);
    return;
  }
  
  console.log(`Found ${products.length} products. Updating star ratings...`);
  
  let successCount = 0;
  
  for (const product of products) {
    // Generate random rating between 4.1 and 5.0
    const rawRating = Math.random() * (5.0 - 4.1) + 4.1;
    const roundedRating = parseFloat(rawRating.toFixed(1));
    
    const { error: updateErr } = await supabaseAdmin
      .from(TABLES.PRODUCTS)
      .update({ rating: roundedRating })
      .eq('id', product.id);
      
    if (updateErr) {
      console.error(`Failed to update ${product.name}:`, updateErr);
    } else {
      console.log(`Updated "${product.name}" -> ${roundedRating} stars.`);
      successCount++;
    }
  }
  
  console.log(`Successfully updated ${successCount}/${products.length} products.`);
}

fixRatingStars().catch(console.error);
