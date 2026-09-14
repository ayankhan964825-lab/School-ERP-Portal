import type { APIRoute } from 'astro';
import { storeContext } from "../../../lib/storeContext";

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('vyaparpe_affiliate_id', { path: '/' });
  return redirect('/affiliate/login');
};

export const POST: APIRoute = async ({ cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    cookies.delete('vyaparpe_affiliate_id', { path: '/' });
    return redirect('/affiliate/login');
  });
};
