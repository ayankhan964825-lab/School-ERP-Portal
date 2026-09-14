import type { APIRoute } from 'astro';
import { verifyAdminSession } from '../../../lib/permissions';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
            const adminId = cookies.get('admin_id')?.value || '';
            const adminRole = cookies.get('admin_role')?.value || '';
            const signature = cookies.get('admin_signature')?.value || '';
            const adminPermissionsCookie = cookies.get('admin_permissions')?.value || '%7B%7D';
            const adminPermissions = decodeURIComponent(adminPermissionsCookie);
    
            // Only allow if it is a valid Super Admin
            if (adminRole !== 'super_admin' || !verifyAdminSession(adminId, adminRole, signature, 'SUPER_ADMIN_BYPASS', adminPermissions)) {
                return redirect('/super-admin/login?error=unauthorized');
            }
    
            const formData = await request.formData();
            const storeId = formData.get('store_id')?.toString();
            const csrfFromForm = formData.get('_csrf')?.toString();
    
            if (!validateCsrfToken(request, cookies, csrfFromForm)) {
                return new Response("CSRF Validation Failed", { status: 403 });
            }
    
            if (storeId === 'reset') {
                cookies.delete('admin_impersonate', { path: '/' });
                return redirect('/super-admin/stores');
            }
    
            if (storeId) {
                cookies.set('admin_impersonate', storeId, {
                    path: '/',
                    maxAge: 60 * 60 * 2, // 2 hours impersonation window
                    httpOnly: true,
                    secure: request.url.startsWith('https'),
                    sameSite: 'lax'
                });
                return redirect('/admin');
            }
    
            return redirect('/super-admin/stores');
        } catch (err) {
            console.error("Impersonation error:", err);
            return redirect('/super-admin/stores?error=failed');
        }
  });
};
