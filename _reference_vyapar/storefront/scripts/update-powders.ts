import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function updatePowders() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  const { data: products, error } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .select('id, name, description, variants')
    .eq('store_id', storeId)
    .eq('category', 'dehydrated-powders');
    
  if (error) {
    console.error(error);
    return;
  }

  for (const product of products) {
    let newDesc = product.description;
    let newVariants = [...product.variants];
    let isUpdated = false;

    // Check combos
    if (product.name.toLowerCase().includes('immunity booster')) {
      newDesc = "A powerful immune-boosting combo containing 100g each of Moringa, Garlic, Amla, and Ginger powders.";
      newVariants = newVariants.map(v => {
        if (v.weight.toLowerCase().includes('box')) {
          v.weight = "4 x 100g";
        }
        return v;
      });
      isUpdated = true;
    } 
    else if (product.name.toLowerCase().includes('detox combo')) {
      newDesc = "Cleanse and rejuvenate your body from within with our natural detox combo containing 100g each of Beetroot, Amla, and Carrot powders.";
      newVariants = newVariants.map(v => {
        if (v.weight.toLowerCase().includes('box')) {
          v.weight = "3 x 100g";
        }
        return v;
      });
      isUpdated = true;
    }
    else if (product.name.toLowerCase().includes('daily green')) {
      newDesc = "Get your daily dose of greens with this healthy combo containing 100g each of Spinach, Amla, and Moringa powders.";
      newVariants = newVariants.map(v => {
        if (v.weight.toLowerCase().includes('box')) {
          v.weight = "3 x 100g";
        }
        return v;
      });
      isUpdated = true;
    }
    else if (product.name.toLowerCase().includes('wellness combo')) {
      newDesc = "Boost your overall wellness with this essential combo containing 100g each of Beetroot, Moringa, and Amla powders.";
      newVariants = newVariants.map(v => {
        if (v.weight.toLowerCase().includes('box')) {
          v.weight = "3 x 100g";
        }
        return v;
      });
      isUpdated = true;
    }
    else {
      // It's a single product, let's update variant weight if it's 200 or 200 gm
      let has200g = false;
      newVariants = newVariants.map(v => {
        if (v.weight.trim() === '200' || v.weight.toLowerCase().trim() === '200 gm' || v.weight.toLowerCase().trim() === '200g') {
          v.weight = "2 x 100g";
          has200g = true;
        }
        return v;
      });
      if (has200g) {
        isUpdated = true;
      }
    }

    if (isUpdated) {
      const { error: updateError } = await supabaseAdmin
        .from(TABLES.PRODUCTS)
        .update({ description: newDesc, variants: newVariants })
        .eq('id', product.id);
        
      if (updateError) {
        console.error(`Error updating product ${product.name}:`, updateError);
      } else {
        console.log(`Successfully updated ${product.name}`);
      }
    }
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  updatePowders().catch(console.error);
});
