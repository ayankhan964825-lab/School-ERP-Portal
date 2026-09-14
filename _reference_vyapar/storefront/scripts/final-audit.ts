import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function finalAudit() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // 1. Settings
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('*').eq('store_id', storeId).single();
  
  // 2. Products
  const { data: products } = await supabaseAdmin.from(TABLES.PRODUCTS).select('id, name, long_description').eq('store_id', storeId);
  
  // 3. Categories
  const { data: categories } = await supabaseAdmin.from(TABLES.CATEGORIES).select('id, name').eq('store_id', storeId);
  
  // 4. Hero Slides
  const { data: heroSlides } = await supabaseAdmin.from(TABLES.HERO_SLIDES).select('id').eq('store_id', storeId);
  
  const pc = typeof settings.pages_content === 'string' ? JSON.parse(settings.pages_content) : (settings.pages_content || {});
  
  const report = {
    BrandIdentity: {
      brand_name: settings.brand_name ? "OK" : "MISSING",
      contact_email: settings.contact_email ? "OK" : "MISSING",
      contact_phone: settings.contact_phone ? "OK" : "MISSING",
      logo_url: settings.logo_url ? "OK" : "MISSING",
      favicon_url: settings.favicon_url ? "OK" : "MISSING"
    },
    CompanyInfo: {
      address: pc.contact_address ? "OK" : "MISSING",
      gstin: pc.gstin ? "OK" : "MISSING",
      fssai: pc.fssai ? "OK" : "MISSING",
      parent_company: pc.parent_company_name === "" ? "INTENTIONALLY BLANK" : pc.parent_company_name
    },
    Products: {
      total_count: products?.length || 0,
      enriched_count: products?.filter(p => p.long_description).length || 0
    },
    Categories: {
      total_count: categories?.length || 0
    },
    LegalPages: {
      privacy_populated: !!pc.page_privacy_policy_0,
      refund_populated: !!pc.page_refund_policy_0,
      shipping_populated: !!pc.page_shipping_policy_0,
      terms_populated: !!pc.page_terms_0,
      sustainability_populated: !!pc.page_sustainability_0,
      warranty_populated: !!pc.page_warranty_0
    },
    HomepageElements: {
      hero_slides_count: heroSlides?.length || 0,
      story_banner: pc.home_story_text ? "OK" : "MISSING",
      usp_strip: pc.home_usps ? "OK" : "MISSING",
      testimonials: pc.home_testimonials ? "OK" : "MISSING",
      announcement_bar: pc.announcement_taglines ? "OK" : "MISSING"
    },
    Theme: {
      theme: pc.website_theme?.active_preset,
      design: pc.website_design?.active_design
    },
    Footer: {
      social_links: pc.social_whatsapp ? "OK" : "MISSING"
    }
  };
  
  console.log(JSON.stringify(report, null, 2));
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  finalAudit().catch(console.error);
});
