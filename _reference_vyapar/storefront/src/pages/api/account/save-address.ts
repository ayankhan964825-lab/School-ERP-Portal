import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { getCustomerById, saveAddress } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value);
    if (!customerId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    let customer = await getCustomerById(customerId);

    if (!customer) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Customer not found' }), { status: 401 });
    }

    const formData = await request.formData();
    let phone = formData.get('phone')?.toString() || '';
    
    // If phone is missing from form, use customer profile phone (if exists)
    if (!phone && customer.phone) {
      phone = customer.phone;
    }

    // We no longer strictly require a phone number for the profile link, 
    // but the address itself might need a contact phone. We use customer_id for linking.
    
    await saveAddress({
        id: formData.get('id')?.toString() || undefined,
        customer_id: customer.id, // The ultimate source of truth
        phone: phone, // Still saving for backward compatibility / delivery contact
        label: formData.get('label')?.toString() || 'Home',
        name: formData.get('name')?.toString() || '',
        street_address: formData.get('street_address')?.toString() || '',
        city: formData.get('city')?.toString() || '',
        state: formData.get('state')?.toString() || '',
        pincode: formData.get('pincode')?.toString() || '',
        contact_phone: formData.get('contact_phone')?.toString() || phone,
      });
    return redirect('/account');
  });
};
