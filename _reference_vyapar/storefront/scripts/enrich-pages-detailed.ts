import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';
import fs from 'fs';

async function executeDetailedPages() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // Load Nutridry dump
  const nutridryData = JSON.parse(fs.readFileSync('nutridry_dump.json', 'utf8'));
  
  // Current TF settings
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('*').eq('store_id', storeId).single();
  let pc = settings.pages_content || {};
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch(e) { pc = {}; }
  }

  const replacements = [
    { from: /The NutriDry/g, to: 'Treasure Flavours' },
    { from: /TheNutriDry/g, to: 'Treasure Flavours' },
    { from: /The Nutridry/g, to: 'Treasure Flavours' },
    { from: /AL AHAD TRADING COMPANY/g, to: 'Treasure Flavours' },
    { from: /info\.nutridry@gmail\.com/g, to: 'connect@treasureflavours.com' },
    { from: /\+91 9984001117 \/ \+91 9984001113/g, to: '+91 9110292275' },
    { from: /\+91 98765 43210/g, to: '+91 9110292275' },
    { from: /https:\/\/www\.thenutridry\.com\//g, to: 'https://treasureflavour.vyaparpe.in/' },
    { from: /122\/3, Awadh Vihar Colony, Near Amausi Intl. Airport, Kanpur Road, Lucknow, 226023/g, to: 'No 80/292, First Floor, B T M Layout, 1st Stage, 1st Phase, Bengaluru, Karnataka, 560029' },
    { from: /dehydrated foods/gi, to: 'premium natural foods, pickles, and powders' },
    { from: /dehydrated vegetable and fruit powders/gi, to: 'premium authentic pickles, podis, and superfood powders' },
    { from: /dehydrated vegetables, fruits/gi, to: 'natural pickles, podis' },
    { from: /dehydrated powders/gi, to: 'authentic powders and pickles' },
    { from: /dehydration technology/gi, to: 'traditional preparation techniques' },
    { from: /dehydration techniques/gi, to: 'sun-drying and cold-pressing techniques' },
    { from: /dehydration process/gi, to: 'preparation process' },
    { from: /removing water content/gi, to: 'using authentic recipes' },
  ];

  function transformText(text: string): string {
    if (!text) return text;
    let res = text;
    for (const r of replacements) {
      res = res.replace(r.from, r.to);
    }
    return res;
  }

  // Keys to copy over and transform
  const keysToCopy = [
    'page_terms_0', 'page_terms_1', 'page_terms_2', 'page_terms_3', 'page_terms_4', 
    'page_terms_5', 'page_terms_6', 'page_terms_7', 'page_terms_8', 'page_terms_9', 'page_terms_10',
    'page_delivery_0', 'page_delivery_1', 'page_delivery_2', 'page_delivery_3', // Delivery/Shipping
    'page_warranty_0', 'page_warranty_1', 'page_warranty_2', 'page_warranty_3', 'page_warranty_4', 'page_warranty_5', 'page_warranty_6',
    'page_seo_blog', 'page_seo_home', 'page_seo_about', 'page_seo_contact', 'page_seo_products',
    'about_title', 'about_content', 'about_subtitle', 'about_hero_text', 'about_hero_title', 
    'about_mission_text', 'about_mission_title', 'about_approach_text', 'about_process_title',
    'global_seo_desc', 'home_story_text', 'home_story_year', 'home_story_bullets'
  ];

  for (const key of keysToCopy) {
    if (nutridryData[key]) {
      if (typeof nutridryData[key] === 'string') {
        pc[key] = transformText(nutridryData[key]);
      } else {
        pc[key] = JSON.parse(transformText(JSON.stringify(nutridryData[key])));
      }
    }
  }
  
  // Specific fix for Shipping policy keys (Nutridry uses delivery, but TF might use shipping)
  // Let's ensure page_shipping_policy_* keys are populated correctly from page_delivery_* if needed
  pc.page_shipping_policy_0 = transformText(nutridryData.page_delivery_0 || "");
  pc.page_shipping_policy_1 = transformText(nutridryData.page_delivery_1 || "");
  pc.page_shipping_policy_2 = transformText(nutridryData.page_delivery_2 || "");
  pc.page_shipping_policy_3 = transformText(nutridryData.page_delivery_3 || "");

  // Update privacy policy - Nutridry might not have it in dump, but I will write it explicitly detailed
  pc.page_privacy_policy_0 = "<p>Welcome to Treasure Flavours's Privacy Policy. Your privacy is critically important to us. We have a few fundamental principles: we don't ask you for personal information unless we truly need it, we don't share your personal information with anyone except to comply with the law, develop our products, or protect our rights.</p>";
  pc.page_privacy_policy_1 = "<p>We collect information about you in a few different ways: (a) Information you provide to us directly (like your name, address, email, and payment info when you checkout), and (b) Information we collect automatically through cookies and tracking technologies (like your IP address and browsing behavior).</p>";
  pc.page_privacy_policy_2 = "<p>We use the information we collect to operate our store, fulfill your orders, communicate with you about promotions or shipping updates, and to improve our website's performance and product offerings.</p>";
  pc.page_privacy_policy_3 = "<p>We do not sell your data. We may share your information with trusted third-party service providers (such as shipping partners and payment gateways) strictly for the purpose of fulfilling your orders. These providers are bound by strict confidentiality agreements.</p>";
  pc.page_privacy_policy_4 = "<p>The security of your personal information is paramount. We use industry-standard encryption protocols (SSL/TLS) to secure data during transmission. Your payment details are processed directly through our secure, RBI-compliant payment gateway partners and are never stored on our servers.</p>";
  pc.page_privacy_policy_5 = "<p>We use cookies to help us identify and track visitors, their usage of our website, and their website access preferences. If you do not wish to have cookies placed on your computer, you should set your browser to refuse cookies before using our website.</p>";
  pc.page_privacy_policy_6 = "<p>You have the right to request access to the personal data we hold about you, or to request that we correct or delete it. To exercise these rights, please contact our support team at connect@treasureflavours.com.</p>";

  // Update process steps properly
  if (nutridryData.about_process_steps) {
    pc.about_process_steps = JSON.parse(transformText(JSON.stringify(nutridryData.about_process_steps)));
  }

  // Set brand name on root
  const { error } = await supabaseAdmin.from(TABLES.SETTINGS).update({
    pages_content: pc,
    brand_name: "Treasure Flavours"
  }).eq('id', settings.id);

  if (error) {
    console.error("Error updating settings:", error);
  } else {
    console.log("Detailed pages content successfully injected!");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  executeDetailedPages().catch(console.error);
});
