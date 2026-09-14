import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';

async function fixCompanyDetails() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // 1. Fetch current settings
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('*').eq('store_id', storeId).single();
  if (!settings) return;

  let pc = settings.pages_content || {};
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch (e) { pc = {}; }
  }

  // Set proper root keys for company details
  pc.contact_address = "no.5 kbar road austin town layout neelasandra bengaluru - 560047";
  pc.gstin = "29AAZFT1344H1ZL";
  pc.fssai = "11226303000187";
  pc.parent_company_name = "";
  pc.social_whatsapp = "9148229076";
  
  // Footer links
  const links = ['About Us', 'Contact', 'Blog', 'Sustainability', 'FAQ', 'Track Order', 'Delivery & Returns', 'Shipping Policy', 'Product Guarantee', 'Bulk Orders', 'Refund Policy', 'Terms of Service', 'Privacy Policy'];
  links.forEach(l => { pc[`show_footer_link_${l.replace(/\s+/g, '_')}`] = 'true'; });

  // Add B2B, Export, APEDA, HACCP, GMP to "Our Story" (Homepage)
  pc.home_story_text = "<p>Born out of a deep respect for traditional Indian culinary wisdom, Treasure Flavours brings you 100% natural, preservative-free foods. From our sun-dried pickles to our nutrient-dense superfood powders, every product is a testament to purity and authentic taste.</p><br/><h3><strong>Export & B2B Manufacturing</strong></h3><p>We take pride in our world-class manufacturing standards. We are actively engaged in <strong>Export, Contract Manufacturing, and B2B partnerships</strong>. Our facilities and products are strictly compliant with global food safety standards, holding prestigious <strong>APEDA, HACCP, and GMP Licences</strong>, ensuring that every bite you take is safe, pure, and of the highest export quality.</p>";

  // Add to "About Us" page as well
  pc.about_mission_text = "<p>Our mission is simple: to make authentic, healthy, and natural food accessible to every household globally. We believe that food should heal, nourish, and bring joy. That's why we strictly say NO to artificial colors, synthetic preservatives, and refined sugars.</p><br/><h3><strong>Global Standards & Licensing</strong></h3><p>Quality is at the heart of everything we do. We cater to <strong>B2B and Export</strong> markets globally, specializing in <strong>Contract Manufacturing</strong>. We proudly hold <strong>APEDA, HACCP, and GMP Licences</strong>, underscoring our commitment to rigorous international food safety and hygiene protocols.</p>";

  // 2. Update DB
  const { error } = await supabaseAdmin.from(TABLES.SETTINGS).update({
    brand_name: "Treasure Flavours",
    contact_email: "connect@treasureflavours.com",
    contact_phone: "9148229076",
    pages_content: pc
  }).eq('id', settings.id);

  if (error) {
    console.error("Error updating settings:", error);
  } else {
    console.log("Successfully updated company details in DB for Treasure Flavours!");
  }
}

import { storeContext } from '../src/lib/storeContext.js';

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fixCompanyDetails().catch(console.error);
});
