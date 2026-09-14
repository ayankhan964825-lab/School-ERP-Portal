import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function updatePowderVariants() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // Get all products in dehydrated-powders category
  const { data: products, error } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .select('id, name')
    .eq('store_id', storeId)
    .eq('category', 'dehydrated-powders');
    
  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  for (const product of products) {
    // Fetch variants for this product from PRODUCT_VARIANTS table
    const { data: variants, error: vError } = await supabaseAdmin
      .from(TABLES.PRODUCT_VARIANTS)
      .select('*')
      .eq('product_id', product.id);

    if (vError || !variants) {
      console.error(`Error fetching variants for ${product.name}:`, vError);
      continue;
    }

    const isImmunity = product.name.toLowerCase().includes('immunity booster');
    const isDetox = product.name.toLowerCase().includes('detox combo');
    const isDailyGreen = product.name.toLowerCase().includes('daily green');
    const isWellness = product.name.toLowerCase().includes('wellness combo');
    const isCombo = isImmunity || isDetox || isDailyGreen || isWellness;

    for (const v of variants) {
      let newWeight = v.weight;
      let newName = v.name;
      let needsUpdate = false;

      if (isCombo) {
        if (v.weight.toLowerCase().includes('box')) {
          if (isImmunity) {
            newWeight = "4 x 100g";
            newName = "4 x 100g";
          } else {
            newWeight = "3 x 100g";
            newName = "3 x 100g";
          }
          needsUpdate = true;
        }
      } else {
        if (v.weight.trim() === '200' || v.weight.toLowerCase().trim() === '200 gm' || v.weight.toLowerCase().trim() === '200g') {
          newWeight = "2 x 100g";
          newName = "2 x 100g";
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from(TABLES.PRODUCT_VARIANTS)
          .update({ weight: newWeight, name: newName })
          .eq('id', v.id);

        if (updateError) {
          console.error(`Error updating variant ${v.id} for ${product.name}:`, updateError);
        } else {
          console.log(`Updated variant for ${product.name}: ${v.weight} -> ${newWeight}`);
        }
      }
    }
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  updatePowderVariants().catch(console.error);
});
