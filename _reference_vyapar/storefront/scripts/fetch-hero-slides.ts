import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fetchHeroSlides() {
  const storeId = '00000000-0000-0000-0000-000000000002'; // Nutridry
  const { data: slides } = await supabaseAdmin.from(TABLES.HERO_SLIDES).select('*').eq('store_id', storeId);
  console.log("Nutridry Slides:", JSON.stringify(slides, null, 2));
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fetchHeroSlides().catch(console.error);
});
