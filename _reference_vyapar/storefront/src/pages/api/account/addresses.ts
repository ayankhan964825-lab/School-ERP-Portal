import { verifyCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { getAddressesByCustomerId, deleteAddress, getCustomerById } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

async function getAuthCustomer(cookies: any, storeId: string) {
  const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value);
  if (!customerId) return null;
  return await getCustomerById(customerId);
}

export const GET: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
    const customer = await getAuthCustomer(cookies, locals.storeId as string);
    if (!customer) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const addresses = await getAddressesByCustomerId(customer.id);
      return new Response(JSON.stringify({ addresses }), { status: 200 });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
    }
  });
};

export const DELETE: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const customer = await getAuthCustomer(cookies, locals.storeId as string);
        if (!customer) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });
    
        // IDOR Fix: We must ensure the address belongs to the authenticated user.
        const addresses = await getAddressesByCustomerId(customer.id);
        const ownsAddress = addresses.some((a: any) => a.id === id);
    
        if (!ownsAddress) {
          return new Response(JSON.stringify({ error: 'Forbidden: Address does not belong to you' }), { status: 403 });
        }
    
        await deleteAddress(id);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
      }
  });
};

