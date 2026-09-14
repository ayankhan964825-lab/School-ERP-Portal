import type { APIRoute } from 'astro';
import { saveBulkInquiry } from '../../../lib/database';
import { sendNotifications } from '../../../lib/notifications';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const data = await request.json();
      const { name, business, phone, email, business_type, products, quantity, frequency, custom_branding, notes } = data;

      // 1. Basic Validation
      if (!name || !phone || !products || products.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Name, phone, and at least one product are required.' }), { status: 400 });
      }

      // 2. Build Requirements String
      const requirementsText = `Type: ${business_type || 'N/A'}\nProducts: ${products.join(', ')}\nQty/Month: ${quantity || 'N/A'}\nFrequency: ${frequency || 'N/A'}\nCustom Branding: ${custom_branding || 'No'}\nNotes: ${notes || 'N/A'}`;

      // 3. Save to Database
      const inquiryPayload = {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        company: business ? String(business).trim() : null,
        requirements: requirementsText,
      };

      await saveBulkInquiry(inquiryPayload);

      // 4. Send Notifications
      await sendNotifications({
        type: 'bulk_order',
        storeId: locals.storeId,
        customerName: inquiryPayload.name,
        customerPhone: inquiryPayload.phone,
        customerEmail: inquiryPayload.email || undefined,
        message: `Company: ${inquiryPayload.company || 'N/A'}\n\n${requirementsText}`
      });

      return new Response(JSON.stringify({ success: true, message: 'Inquiry submitted successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Error processing bulk inquiry:', error);
      return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), { status: 500 });
    }
  });
};
