import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSuperAdmins, hashPassword } from '../../../lib/permissions';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSuperAdmins(ctx)) {
        return new Response('Unauthorized', { status: 401 });
      }
    const formData = await request.formData();
    const action = formData.get('action')?.toString();
    const csrfToken = formData.get('_csrf')?.toString();
    if (!validateCsrfToken(request, cookies, csrfToken)) {
        return redirect('/super-admin/rbac?error=csrf_invalid');
      }
    if (action === 'save_role') {
        const role_id = formData.get('role_id')?.toString();
        const name = formData.get('name')?.toString() || '';
        
        const permissions = {
          can_create_stores: formData.get('perm_can_create_stores') === 'on',
          can_manage_plans: formData.get('perm_can_manage_plans') === 'on',
          can_process_payouts: formData.get('perm_can_process_payouts') === 'on',
          can_approve_marketplace: formData.get('perm_can_approve_marketplace') === 'on',
          can_manage_super_admins: formData.get('perm_can_manage_super_admins') === 'on',
        };
    
        if (role_id) {
          await supabaseAdmin.from(TABLES.SUPER_ADMIN_ROLES).update({ name, permissions }).eq('id', role_id);
          await logAdminActivity(ctx, request, 'Updated Role', `Role: ${name}`);
        } else {
          await supabaseAdmin.from(TABLES.SUPER_ADMIN_ROLES).insert([{ name, permissions }]);
          await logAdminActivity(ctx, request, 'Created Role', `Role: ${name}`);
        }
      } 
      else if (action === 'save_staff') {
        const staff_id = formData.get('staff_id')?.toString();
        const name = formData.get('name')?.toString() || '';
        const email = formData.get('email')?.toString().toLowerCase() || '';
        const phone = formData.get('phone')?.toString() || '';
        const password = formData.get('password')?.toString() || '';
        const role_id = formData.get('role_id')?.toString();
    
        // Check for existing phone or email (excluding current user if editing)
        let query = supabaseAdmin
          .from(TABLES.SUPER_ADMINS)
          .select('id')
          .or(`email.eq.${email},phone.eq.${phone}`);
          
        if (staff_id) {
            query = query.neq('id', staff_id);
        }
        
        const { data: existing } = await query.single();
    
        if (existing) {
          return redirect('/super-admin/rbac?error=duplicate_user');
        }
    
        const payload: any = { name, email, phone, role_id };
        if (password) {
            payload.password_hash = hashPassword(password);
        }
    
        if (staff_id) {
            await supabaseAdmin.from(TABLES.SUPER_ADMINS).update(payload).eq('id', staff_id);
            await logAdminActivity(ctx, request, 'Updated Staff', `Staff: ${name}`);
        } else {
            await supabaseAdmin.from(TABLES.SUPER_ADMINS).insert([payload]);
            await logAdminActivity(ctx, request, 'Created Staff', `Staff: ${name}`);
        }
      }
    return redirect('/super-admin/rbac');
  });
};
