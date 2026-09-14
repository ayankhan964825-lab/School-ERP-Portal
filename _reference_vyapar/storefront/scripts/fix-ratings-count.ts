import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_ANON_KEY!);
import { TABLES } from '../src/lib/constants.js';
async function fixRatingCounts() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // 1. Fetch all products for the store
  const { data: products, error: fetchErr } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .select('id, name')
    .eq('store_id', storeId);
    
  if (fetchErr) {
    console.error("Error fetching products:", fetchErr);
    return;
  }
  
  if (!products || products.length === 0) {
    console.log("No products found for this store.");
    return;
  }
  
  console.log(`Found ${products.length} products. Updating reviews_count...`);
  
  let successCount = 0;
  
  // 2. Loop through and assign random review count between 15 and 85
  for (const product of products) {
    const randomReviewCount = Math.floor(Math.random() * (85 - 15 + 1)) + 15;
    
    const { error: updateErr } = await supabaseAdmin
      .from(TABLES.PRODUCTS)
      .update({ reviews_count: randomReviewCount })
      .eq('id', product.id);
      
    if (updateErr) {
      console.error(`Failed to update ${product.name}:`, updateErr);
    } else {
      console.log(`Updated "${product.name}" -> ${randomReviewCount} reviews.`);
      successCount++;
    }
  }
  
  console.log(`Successfully updated ${successCount}/${products.length} products.`);
}

fixRatingCounts().catch(console.error);
