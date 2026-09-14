import type { APIRoute } from 'astro';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    cookies.delete('admin_auth', { path: '/' });
    cookies.delete('admin_role', { path: '/' });
    cookies.delete('admin_id', { path: '/' });
    cookies.delete('admin_signature', { path: '/' });
    cookies.delete('admin_session_token', { path: '/' });
    cookies.delete('admin_permissions', { path: '/' });
    cookies.delete('admin_hierarchy', { path: '/' });
    cookies.delete('admin_name', { path: '/' });
    cookies.delete('admin_store', { path: '/' });
    return redirect('/admin/login');
  });
};
