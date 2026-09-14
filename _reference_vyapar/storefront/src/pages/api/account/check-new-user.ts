import type { APIRoute } from 'astro';
import { getCustomerByPhone } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const { phone } = await request.json();
        if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
          return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400 });
        }
    
        const existing = await getCustomerByPhone(phone);
        return new Response(JSON.stringify({ isNew: !existing }), { status: 200 });
      } catch (error) {
        console.error('check-new-user error:', error);
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
      }
  });
};
