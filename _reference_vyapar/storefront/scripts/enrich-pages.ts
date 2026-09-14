import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fillAllPages() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('*').eq('store_id', storeId).single();
  
  let pc = settings.pages_content || {};
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch(e) { pc = {}; }
  }

  // --- SUSTAINABILITY ---
  pc.page_sustainability_0 = "<p>At Treasure Flavours, sustainability is not just a buzzword; it is a core value woven into every aspect of our business. We recognize our responsibility to protect the planet and are dedicated to making choices that positively impact our environment and communities.</p>";
  pc.page_sustainability_1 = "<p>We source our ingredients responsibly from local farmers who practice sustainable agriculture. This ensures the highest quality while supporting local economies.</p>";
  pc.page_sustainability_2 = "<p>We are actively transitioning to eco-friendly packaging materials. Our goal is to use 100% recyclable or compostable packaging for all our products.</p>";
  pc.page_sustainability_3 = "<p>Our production processes are designed to minimize energy use. We rely on traditional, low-energy methods like sun-drying and shade-drying wherever possible.</p>";
  pc.page_sustainability_4 = "<p>We are committed to minimizing food waste. By dehydrating fresh produce at its peak, we extend shelf life naturally, reducing the amount of food that ends up in landfills.</p>";
  pc.page_sustainability_5 = "<p>We continuously look for ways to improve our sustainability practices. Your support helps us invest in better, greener technologies for the future.</p>";

  // --- WARRANTY (PRODUCT GUARANTEE) ---
  pc.page_warranty_0 = "<p>We stand behind the quality of our products. The Treasure Flavours Product Guarantee ensures you receive only the best, purest, and freshest items.</p>";
  pc.page_warranty_1 = "<p>If you receive a product that is damaged, defective, or not as described, we offer a 100% Quality Guarantee. We will replace the item or provide a full refund.</p>";
  pc.page_warranty_2 = "<p>Our guarantee covers manufacturing defects, spoilage before the expiry date (if stored correctly), and damages incurred during transit.</p>";
  pc.page_warranty_3 = "<p>This guarantee does not cover damages caused by improper storage after delivery, accidental drops, or consumption past the stated shelf life.</p>";
  pc.page_warranty_4 = "<p>To claim the guarantee, please contact our support team within 48 hours of delivery with your order number and clear photographs of the product.</p>";
  pc.page_warranty_5 = "<p>Upon approval, a replacement will be shipped within 3 business days, or a refund will be initiated to your original payment method.</p>";
  pc.page_warranty_6 = "<p>For any queries regarding our guarantee, reach out to connect@treasureflavours.com.</p>";

  // --- TERMS OF SERVICE ---
  pc.page_terms_0 = "<p>Welcome to Treasure Flavours. These Terms of Service govern your use of our website and services. Please read them carefully.</p>";
  pc.page_terms_1 = "<p>By accessing or using our website, you agree to be bound by these terms. If you do not agree with any part, you must not use our services.</p>";
  pc.page_terms_2 = "<p>Our products are natural and preservative-free. Product descriptions and images are for reference; actual products may vary slightly in color due to natural ingredients.</p>";
  pc.page_terms_3 = "<p>All prices are subject to change without notice. We reserve the right to modify or discontinue products at any time.</p>";
  pc.page_terms_4 = "<p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer.</p>";
  pc.page_terms_5 = "<p>We aim to process and dispatch orders promptly. Delivery times are estimates and may vary due to external factors.</p>";
  pc.page_terms_6 = "<p>Returns are only accepted for damaged or incorrect items as per our Refund Policy.</p>";
  pc.page_terms_7 = "<p>All content on this site, including text, graphics, logos, and images, is the property of Treasure Flavours and protected by copyright laws.</p>";
  pc.page_terms_8 = "<p>You agree not to use our website for any unlawful purpose or to solicit others to perform or participate in any unlawful acts.</p>";
  pc.page_terms_9 = "<p>We shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of our products or website.</p>";
  pc.page_terms_10 = "<p>These terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bengaluru.</p>";

  // --- PRIVACY POLICY ---
  pc.page_privacy_policy_0 = "<p>At Treasure Flavours, we value your privacy. This Privacy Policy outlines how we collect, use, and protect your personal information.</p>";
  pc.page_privacy_policy_1 = "<p>We collect information you provide directly to us, such as your name, email address, shipping address, and payment details when you place an order.</p>";
  pc.page_privacy_policy_2 = "<p>We use this information to fulfill your orders, communicate with you about your purchase, provide customer support, and improve our services.</p>";
  pc.page_privacy_policy_3 = "<p>We do not sell your personal information. We may share data with trusted third parties (like delivery partners and payment gateways) solely to process your order.</p>";
  pc.page_privacy_policy_4 = "<p>We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure.</p>";
  pc.page_privacy_policy_5 = "<p>Our website uses cookies to enhance your browsing experience, remember your preferences, and analyze site traffic.</p>";
  pc.page_privacy_policy_6 = "<p>You have the right to access, correct, or delete your personal information. Contact us if you wish to exercise these rights.</p>";

  // --- SHIPPING POLICY ---
  pc.page_shipping_policy_0 = "<p>We are dedicated to delivering your Treasure Flavours products quickly and safely.</p>";
  pc.page_shipping_policy_1 = "<p>We ship our products PAN India using reliable courier partners.</p>";
  pc.page_shipping_policy_2 = "<p>Standard shipping is ₹60 for orders below ₹499. Enjoy FREE shipping on all orders above ₹499!</p>";
  pc.page_shipping_policy_3 = "<p>Orders are typically dispatched within 1-2 business days. Delivery takes 3-7 business days depending on your location.</p>";
  pc.page_shipping_policy_4 = "<p>Once your order is shipped, you will receive an email and SMS with the tracking details so you can monitor its journey.</p>";

  // --- REFUND POLICY ---
  pc.page_refund_policy_0 = "<p>We want you to be completely satisfied with your Treasure Flavours purchase.</p>";
  pc.page_refund_policy_1 = "<p>Due to the consumable nature of our products, we do not accept general returns. However, we offer replacements or refunds for damaged, defective, or incorrect items.</p>";
  pc.page_refund_policy_2 = "<p>If an item arrives damaged, we cover the delivery costs for the replacement. Original shipping charges are non-refundable.</p>";
  pc.page_refund_policy_3 = "<p>To claim a refund or replacement, contact us within 48 hours of delivery with photographic evidence of the issue.</p>";
  pc.page_refund_policy_4 = "<p>Orders can be cancelled before they are dispatched for a full refund. Once shipped, cancellations are not permitted.</p>";

  // --- UPDATE ---
  const { error } = await supabaseAdmin.from(TABLES.SETTINGS).update({
    pages_content: pc
  }).eq('id', settings.id);

  if (error) {
    console.error("Error updating settings:", error);
  } else {
    console.log("Successfully filled all pages in DB for Treasure Flavours!");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fillAllPages().catch(console.error);
});
