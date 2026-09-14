import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';
import { randomUUID } from 'crypto';

async function addHeroSlidesAndHomepageElements() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // Clean old slides if any
  await supabaseAdmin.from(TABLES.HERO_SLIDES).delete().eq('store_id', storeId);
  
  const slides = [
    {
      id: randomUUID(),
      store_id: storeId,
      media_url: 'https://images.unsplash.com/photo-1596649299486-4cdea56fd59d?q=80&w=2000&auto=format&fit=crop',
      media_type: 'image',
      headline: 'Authentic Indian Pickles.',
      headline_accent: '100% Natural.',
      description: 'Sun-dried and prepared with cold-pressed oils. Experience the true taste of Andhra.',
      tagline: 'Best Sellers',
      button_text: 'Shop Pickles',
      button_link: '/products',
      sort_order: 1,
      is_active: true
    },
    {
      id: randomUUID(),
      store_id: storeId,
      media_url: 'https://images.unsplash.com/photo-1615486171448-4fb3eb33d596?q=80&w=2000&auto=format&fit=crop',
      media_type: 'image',
      headline: 'Premium Superfood Powders.',
      headline_accent: 'Pure & Potent.',
      description: 'Nutrient-dense powders for a healthy lifestyle. No preservatives, no additives.',
      tagline: 'Wellness',
      button_text: 'Explore Powders',
      button_link: '/products',
      sort_order: 2,
      is_active: true
    }
  ];

  const { error: slideError } = await supabaseAdmin.from(TABLES.HERO_SLIDES).insert(slides);
  
  if (slideError) {
    console.error("Error inserting slides:", slideError);
    return;
  }
  
  // Now add USPs, testimonials, and story stats to settings
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('*').eq('store_id', storeId).single();
  let pc = settings.pages_content || {};
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch(e) { pc = {}; }
  }

  pc.home_usps = JSON.stringify([
    { title: "100% Pure", desc: "No additives, fillers, or artificial ingredients." },
    { title: "No Preservatives", desc: "Traditional preservation methods only." },
    { title: "Authentic Recipes", desc: "Handcrafted using generational recipes." },
    { title: "Farm to Table", desc: "Sourced directly from local farmers." }
  ]);

  pc.home_testimonials = JSON.stringify([
    { name: "Priya S.", city: "Mumbai", review: "The Gongura Pickle tastes exactly like my grandmother's. Simply amazing and absolutely no preservatives!" },
    { name: "Rahul K.", city: "Delhi", review: "The Moringa Powder has become a staple in my daily smoothies. So pure and potent." },
    { name: "Ananya M.", city: "Bangalore", review: "I love the Chana Dal Podi. It's the perfect side for idlis and surprisingly authentic." }
  ]);
  
  pc.home_story_stats = JSON.stringify([
    { num: "25+", label: "Products" },
    { num: "0%", label: "Preservatives" },
    { num: "100%", label: "Natural" },
    { num: "1K+", label: "Happy Customers" }
  ]);

  pc.announcement_taglines = JSON.stringify([
    "Premium Authentic Foods - Free Shipping on Orders Over ₹499!"
  ]);

  const { error: updateError } = await supabaseAdmin.from(TABLES.SETTINGS).update({
    pages_content: pc
  }).eq('id', settings.id);

  if (updateError) {
    console.error("Error updating settings:", updateError);
  } else {
    console.log("Successfully inserted Hero Slides and Homepage Elements!");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  addHeroSlidesAndHomepageElements().catch(console.error);
});
