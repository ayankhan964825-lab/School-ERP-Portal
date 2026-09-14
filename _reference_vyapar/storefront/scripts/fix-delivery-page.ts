import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function fixDelivery() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('*').eq('store_id', storeId).single();
  if (!settings) return;

  let pc = settings.pages_content || {};
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch(e) { pc = {}; }
  }

  // Populate page_delivery_* keys used by delivery.astro
  pc.page_delivery_0 = "<p>At Treasure Flavours, we ensure that your orders are processed and shipped securely. We typically dispatch all orders within 24-48 business hours. Deliveries across India generally take 3-7 business days depending on your location. You will receive tracking details via email/SMS once your order leaves our facility.</p>";
  
  pc.page_delivery_1 = "<p>Due to the consumable nature of our natural food products (Pickles, Podis, Powders, etc.), we do not accept general returns or exchanges. However, you are eligible for a free replacement or a full refund if you receive a product that is:<br/>- Damaged during transit<br/>- Defective or spoiled<br/>- Incorrect item delivered</p>";
  
  pc.page_delivery_2 = "<p>We cannot accept returns or provide refunds for:<br/>- Items that have been opened or partially consumed.<br/>- Damages caused by improper storage after delivery.<br/>- Claims made after 48 hours of delivery.<br/>- Variations in taste or color (since our products are 100% natural and made without synthetic additives, slight seasonal variations are normal).</p>";
  
  pc.page_delivery_3 = "<p>If your order is eligible for a return/replacement, please follow these steps:<br/>1. Contact our support team at <strong>connect@treasureflavours.com</strong> within 48 hours of receiving the delivery.<br/>2. Include your Order ID and clear photographs of the damaged/incorrect product and the shipping box.<br/>3. Our team will review the claim within 24 hours.<br/>4. Upon approval, we will dispatch a replacement immediately at no extra cost, or process a refund to your original payment method within 5-7 business days.</p>";

  const { error } = await supabaseAdmin.from(TABLES.SETTINGS).update({
    pages_content: pc
  }).eq('id', settings.id);

  if (error) {
    console.error("Error updating DB:", error);
  } else {
    console.log("Successfully updated Delivery & Returns page content!");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fixDelivery().catch(console.error);
});
