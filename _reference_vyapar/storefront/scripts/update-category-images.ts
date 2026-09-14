import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function updateCategoryImages() {
  const updates = [
    { slug: 'veg-pickle', image_url: '/images/categories/veg-pickle.png' },
    { slug: 'andhra-style-podis', image_url: '/images/categories/andhra-podis.png' },
    { slug: 'dehydrated-powders', image_url: '/images/categories/dehydrated-powders.png' },
    { slug: 'herbal-tea', image_url: '/images/categories/herbal-tea.png' },
    { slug: 'natural-foods', image_url: '/images/categories/natural-foods.png' }
  ];

  for (const update of updates) {
    const { error } = await supabaseAdmin.from(TABLES.CATEGORIES).update({ image: update.image_url }).eq('slug', update.slug);
    if (error) {
      console.error(`Error updating category ${update.slug}:`, error);
    } else {
      console.log(`Updated category ${update.slug} with ${update.image_url}`);
    }
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  updateCategoryImages().catch(console.error);
});
