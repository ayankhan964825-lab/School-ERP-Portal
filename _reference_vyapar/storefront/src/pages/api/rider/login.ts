import type { APIRoute } from 'astro';
import { getStaff } from '../../../lib/database';
import { hashPassword } from '../../../lib/permissions';
import { storeContext } from '../../../lib/storeContext';

export const POST: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: locals.storeId || 'test-store' }, async () => {
    try {
      const { phone, password } = await request.json();

      if (!phone || !password) {
        return new Response(JSON.stringify({ error: 'Phone and password are required' }), { status: 400 });
      }

      const allStaff = await getStaff();
      const hashedInput = hashPassword(password);
      
      const rider = allStaff.find(
        (s: any) =>
          s.phone?.toString().trim() === phone.trim() &&
          s.password?.toString().trim() === hashedInput &&
          s.role === 'rider' &&
          s.is_active !== false
      );

      if (rider) {
        const { signRiderAuth } = await import('../../../lib/auth');
        const token = signRiderAuth(rider.id, locals.storeId || 'test-store');
        return new Response(JSON.stringify({ 
          success: true, 
          token,
          rider: { id: rider.id, name: rider.name, phone: rider.phone }
        }), { status: 200 });
      } else {
        return new Response(JSON.stringify({ error: 'Invalid phone number or password' }), { status: 401 });
      }
    } catch (error: any) {
      console.error('Rider login error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
  });
};
