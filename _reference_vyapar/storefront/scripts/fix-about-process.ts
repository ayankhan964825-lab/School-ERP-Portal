import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fixAboutAndProcess() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('*').eq('store_id', storeId).single();
  if (!settings) return;

  let pc = settings.pages_content || {};
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch(e) { pc = {}; }
  }

  // Fix Hero to be inclusive of all products
  pc.about_hero_title = "Authentic Taste for<br/>Global Markets";
  pc.about_hero_text = "Treasure Flavours is your trusted partner for premium natural foods. From our authentic Andhra-style pickles and traditional podis to nutrient-dense superfood powders and herbal teas. With deep expertise in B2B supply and contract manufacturing, we export our diverse product range worldwide, backed by strict APEDA, HACCP, and GMP certifications.";

  // Set Our Process Section
  pc.about_process_title = "Our Manufacturing Process";
  pc.about_process_subtitle = "From farm to export, quality is maintained at every step.";
  
  pc.about_process_steps = [
    { 
      title: 'Ethical Sourcing', 
      desc: 'We partner directly with farmers to source the freshest, 100% natural ingredients without any artificial chemicals.', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>' 
    },
    { 
      title: 'Traditional Preparation', 
      desc: 'We utilize time-honored methods like sun-drying, shade-drying, and cold-pressing to retain natural flavors and essential oils naturally.', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>' 
    },
    { 
      title: 'Quality & Testing', 
      desc: 'Every batch undergoes rigorous lab testing to ensure strict compliance with HACCP, GMP, and global food safety standards.', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' 
    },
    { 
      title: 'Export Packaging', 
      desc: 'Our products are securely packaged using premium, moisture-resistant materials designed for safe B2B transit worldwide.', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>' 
    }
  ];

  const { error } = await supabaseAdmin.from(TABLES.SETTINGS).update({
    pages_content: pc
  }).eq('id', settings.id);

  if (error) {
    console.error("Error updating DB:", error);
  } else {
    console.log("Successfully updated About Us content and Process Steps!");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fixAboutAndProcess().catch(console.error);
});
