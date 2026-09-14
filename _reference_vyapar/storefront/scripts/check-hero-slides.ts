import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fetchHeroSlides() {
  const { data: slides, error } = await supabaseAdmin.from(TABLES.HERO_SLIDES).select('*').limit(1);
  if (error) console.error(error);
  else console.log(slides);
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fetchHeroSlides().catch(console.error);
});
