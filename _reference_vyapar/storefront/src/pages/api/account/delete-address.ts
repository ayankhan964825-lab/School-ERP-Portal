import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { getAddressesByCustomerId, deleteAddress, getCustomerById } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value);
        
        if (!customerId) {
          return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
            status: 401, headers: { 'Content-Type': 'application/json' }
          });
        }
        
        let customer = await getCustomerById(customerId);
    
        if (!customer) {
          return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Customer not found' }), {
            status: 401, headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const body = await request.json();
        const id = body.id?.toString();
        if (!id) {
          return new Response(JSON.stringify({ success: false, error: 'Address ID required' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }
    
        const addresses = await getAddressesByCustomerId(customer.id);
        const ownsAddress = addresses.some((a: any) => a.id?.toString() === id?.toString());
    
        if (!ownsAddress) {
          return new Response(JSON.stringify({ success: false, error: 'Forbidden: Address does not belong to you' }), {
            status: 403, headers: { 'Content-Type': 'application/json' }
          });
        }
    
        await deleteAddress(id);
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
  });
};
