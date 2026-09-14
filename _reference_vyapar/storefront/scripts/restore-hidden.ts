import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

// Parsed from product_audit.md
const hiddenVariants = [
  { productSlug: 'lemon-pickle', weight: '100 gm' },
  { productSlug: 'red-chilli-pickle', weight: '100 gm' },
  { productSlug: 'gongura-pickle', weight: '100 gm' },
  { productSlug: 'amla-pickle', weight: '100 gm' },
  { productSlug: 'chana-dal-podi', weight: '250 gm' },
  { productSlug: 'chana-dal-podi', weight: '750' },
  { productSlug: 'chana-dal-podi', weight: '500' },
  { productSlug: 'chana-dal-podi', weight: '1000' },
  { productSlug: 'ground-nut-podi', weight: '500' },
  { productSlug: 'ground-nut-podi', weight: '1000' },
  { productSlug: 'ground-nut-podi', weight: '250 gm' },
  { productSlug: 'ground-nut-podi', weight: '750' },
  { productSlug: 'moringa-chilli-podi', weight: '500' },
  { productSlug: 'moringa-chilli-podi', weight: '1000' },
  { productSlug: 'moringa-chilli-podi', weight: '750' },
  { productSlug: 'moringa-chilli-podi', weight: '250 gm' },
  { productSlug: 'flax-seeds-podi', weight: '250 gm' },
  { productSlug: 'flax-seeds-podi', weight: '750' },
  { productSlug: 'flax-seeds-podi', weight: '1000' },
  { productSlug: 'flax-seeds-podi', weight: '500' },
  { productSlug: 'curry-leaf-podi', weight: '500' },
  { productSlug: 'curry-leaf-podi', weight: '1000' },
  { productSlug: 'curry-leaf-podi', weight: '100 gm' },
  { productSlug: 'curry-leaf-podi', weight: '250' },
  { productSlug: 'curry-leaf-podi', weight: '750' }
];

async function restoreHiddenVariants() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  for (const item of hiddenVariants) {
    const { data: product } = await supabaseAdmin.from(TABLES.PRODUCTS).select('id').eq('slug', item.productSlug).single();
    if (product) {
       await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS)
          .update({ is_hidden: true })
          .eq('product_id', product.id)
          .eq('weight', item.weight);
       console.log(`Hid variant ${item.weight} for ${item.productSlug}`);
    }
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  restoreHiddenVariants().catch(console.error);
});
