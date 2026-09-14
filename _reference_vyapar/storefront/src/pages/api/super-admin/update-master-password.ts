import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { getPermissionContext, hashPassword } from '../../../lib/permissions';
import { supabaseAdmin } from '../../../lib/database';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const ctx = getPermissionContext(cookies);
        // Only original super admin (from .env or role=super_admin with hierarchy=0/1) can change their own password
        if (!ctx.isOriginalSuperAdmin) {
          return new Response(JSON.stringify({ error: 'Unauthorized. Only the root administrator can perform this action.' }), { status: 403 });
        }
    
        const formData = await request.formData();
        const csrfToken = formData.get('_csrf')?.toString();
        const newPassword = formData.get('new_master_password')?.toString();
    
        if (!validateCsrfToken(request, cookies, csrfToken)) {
          return new Response(JSON.stringify({ error: "Invalid CSRF token" }), { status: 403 });
        }
    
        if (!newPassword || newPassword.length < 6) {
          return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), { status: 400 });
        }
    
        const adminEmail = import.meta.env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'faisal.khan1192519@gmail.com';
        const hashedNew = hashPassword(newPassword);
    
        // Ensure Master Role exists
        let { data: roleData } = await supabaseAdmin
          .from(TABLES.SUPER_ADMIN_ROLES)
          .select('id')
          .eq('name', 'Master DB Admin')
          .single();
    
        if (!roleData) {
          const { data: newRole } = await supabaseAdmin
            .from(TABLES.SUPER_ADMIN_ROLES)
            .insert([{
              name: 'Master DB Admin',
              permissions: {
                can_create_stores: true,
                can_manage_plans: true,
                can_process_payouts: true,
                can_approve_marketplace: true,
                can_manage_super_admins: true
              }
            }])
            .select('id')
            .single();
          roleData = newRole;
        }
    
        // Check if user already exists
        const { data: existingAdmin } = await supabaseAdmin
          .from(TABLES.SUPER_ADMINS)
          .select('id')
          .eq('email', adminEmail)
          .single();
    
        if (existingAdmin) {
          const { error: updateError } = await supabaseAdmin
            .from(TABLES.SUPER_ADMINS)
            .update({ password_hash: hashedNew })
            .eq('id', existingAdmin.id);
            
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabaseAdmin
            .from(TABLES.SUPER_ADMINS)
            .insert([{
              email: adminEmail,
              password_hash: hashedNew,
              name: 'Master Admin',
              phone: '1234567890',
              role_id: roleData?.id,
              is_active: true
            }]);
            
          if (insertError) throw insertError;
        }
    
        await logAdminActivity(ctx, request, 'Security', 'Master Password updated via UI');
    
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (error: any) {
        console.error('Update Master Password Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
  });
};
