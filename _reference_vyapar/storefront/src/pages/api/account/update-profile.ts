import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { saveCustomer, getCustomerById } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value);
    if (!customerId) return redirect('/account/login');
    const existingCustomer = await getCustomerById(customerId);
    if (!existingCustomer) return redirect('/account/login');

    const formData = await request.formData();
    
    const customerData: any = { id: customerId };
    
    const name = formData.get('name');
    if (name !== null) customerData.name = name.toString();
    
    const email = formData.get('email');
    if (email !== null) customerData.email = email.toString();
    
    const phone = formData.get('phone');
    if (phone !== null) customerData.phone = phone.toString();

    await saveCustomer(customerData);
    return redirect('/account');
  });
};
