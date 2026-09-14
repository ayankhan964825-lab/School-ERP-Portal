import type { APIRoute } from 'astro';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    cookies.delete('customer_auth', { path: '/' });
    return redirect('/account/login');
  });
};
