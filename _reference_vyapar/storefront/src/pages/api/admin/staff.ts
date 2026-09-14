import type { APIRoute } from 'astro';
import { saveStaffMember, updateStaffMember, deleteStaffMember, getStaff, getStaffDescendantIds, logActivity, getSettings } from '../../../lib/database';
import { getPermissionContext, canManageSection, hashPassword } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

// Protected role names that only the Original Super Admin (hierarchy 0) can use
// Protected role names that only the Original Super Admin (hierarchy 0) can use
const PROTECTED_ROLE_NAMES = ['super admin', 'superadmin', 'super_admin', 'admin', 'original admin', 'root'];

function isProtectedRoleName(roleName: string): boolean {
  return PROTECTED_ROLE_NAMES.includes(roleName.trim().toLowerCase());
}

export const GET: APIRoute = async ({ cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'staff')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

    try {
      const staff = await getStaff();
      return new Response(JSON.stringify({ success: true, count: staff.length, staff }), { status: 200 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: 'Failed to fetch staff', details: error?.message }), { status: 500 });
    }
  });
};

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const { action, id, ...data } = body;
    
        // ── SECURE AUTHENTICATION VERIFICATION ──
        const ctx = getPermissionContext(cookies);
        const callerId = ctx.adminId;
        const callerHierarchy = ctx.hierarchyLevel;
        const isOriginalSuperAdmin = ctx.isOriginalSuperAdmin;
        const callerName = ctx.adminName;
    
        if (action !== 'request_reset' && ctx.adminRole === 'guest') {
          return new Response(JSON.stringify({ error: 'Unauthorized. Invalid or inactive session.' }), { status: 401 });
        }
    
        if (action === 'request_reset') {
          // Unauthenticated action allowed
          if (!data.email) return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
          
          const cleanEmail = data.email.trim().toLowerCase();
          
          const currentSettings = await getSettings();
          let pc = currentSettings.pages_content;
          if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch {} }
          const customEmail = (pc && typeof pc === 'object' && pc.super_admin_custom_email) ? pc.super_admin_custom_email : null;
          const adminEmail = (customEmail || import.meta.env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').toLowerCase();
          const allStaff = await getStaff();
          const target = allStaff.find((s: any) => s.email?.toLowerCase() === cleanEmail);
          
          // If it's the original super admin email
          if (cleanEmail === adminEmail) {
            return new Response(JSON.stringify({ 
              success: true, 
              isSuperAdmin: true, 
              message: 'Request has been sent to developer (but use email recovery to change password instantly).' 
            }), { status: 200 });
          }
    
          if (!target) {
            // Return success anyway to prevent email enumeration
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          }
          
          const level = parseInt(target.hierarchy_level || '5', 10);
          if (level <= 1) {
            // Secondary Super Admin
            await updateStaffMember(target.id, { reset_requested: true });
            return new Response(JSON.stringify({ 
              success: true, 
              isSuperAdmin: true, 
              message: 'Request has been sent to developer (but use email recovery to change password instantly).' 
            }), { status: 200 });
          }
          
          await updateStaffMember(target.id, { reset_requested: true });
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'dismiss_reset') {
          if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });
          if (!isOriginalSuperAdmin) {
            const descendants = await getStaffDescendantIds(callerId);
            if (!descendants.includes(id)) {
              return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
            }
          }
          await updateStaffMember(id, { reset_requested: false });
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'admin_reset_password') {
          if (!id || !data.new_password) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
          
          // Enforce strict branch isolation
          if (!isOriginalSuperAdmin) {
            const descendants = await getStaffDescendantIds(callerId);
            if (!descendants.includes(id)) {
              return new Response(JSON.stringify({ error: 'You are not authorized to reset the password for this staff member as they are not in your branch.' }), { status: 403 });
            }
          }
          
          await updateStaffMember(id, { password: hashPassword(data.new_password.trim()), reset_requested: false });
          try { await logActivity(callerId, callerName, 'Reset Staff Password', id, {}, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'create_bulk') {
          const { staff } = data;
          if (!Array.isArray(staff) || staff.length === 0) {
            return new Response(JSON.stringify({ error: 'No staff provided' }), { status: 400 });
          }
    
          const allStaff = await getStaff();
          const existingEmails = new Set(allStaff.map((s: any) => s.email?.toLowerCase()));
    
          const createdStaff = [];
          for (const stData of staff) {
            if (!stData.name || !stData.email) continue;
            const cleanEmail = stData.email.trim().toLowerCase();
            if (existingEmails.has(cleanEmail)) continue; // skip duplicates silently for bulk
    
            let targetHierarchy = parseInt(stData.hierarchy_level, 10);
            if (isNaN(targetHierarchy)) targetHierarchy = 5;
            const customRole = (stData.role || 'staff').trim();
    
            // ── Hierarchy enforcement ──
            if (!isOriginalSuperAdmin) {
              if (targetHierarchy <= callerHierarchy) continue; // skip unauthorized hierarchy
              if (isProtectedRoleName(customRole)) continue; // skip protected roles
              
              // Prevent permission delegation escalation
              if (stData.permissions && typeof stData.permissions === 'object') {
                let hasUnauthorizedPermission = false;
                for (const [section, level] of Object.entries(stData.permissions)) {
                  if (level === 'manage' || level === 'view') {
                    const callerLevel = ctx.permissions[section];
                    if (callerLevel !== 'manage' && !(callerLevel === 'view' && level === 'view')) {
                      hasUnauthorizedPermission = true;
                      break;
                    }
                  }
                }
                if (hasUnauthorizedPermission) continue;
              }
            }
    
            const automatedRecoveryMethod = targetHierarchy <= 1 ? 'contact_dev_or_email' : 'contact_admin';
            const cleanData = {
              ...stData,
              email: cleanEmail,
              password: stData.password ? hashPassword(stData.password.trim()) : hashPassword('defaultPassword123'),
              role: customRole,
              hierarchy_level: targetHierarchy,
              created_by: callerId,
              recovery_method: automatedRecoveryMethod,
            };
    
            const member = await saveStaffMember(cleanData);
            existingEmails.add(cleanEmail);
            createdStaff.push(member);
            try { await logActivity(callerId, callerName, 'Created Staff Account (Bulk)', member.id || cleanEmail, { role: customRole, level: targetHierarchy }, request); } catch (logErr) {}
          }
    
          return new Response(JSON.stringify({ success: true, count: createdStaff.length, staff: createdStaff }), { status: 200 });
        }
    
        if (action === 'create') {
          if (!data.name || !data.email) {
            return new Response(JSON.stringify({ error: 'Name and email are required' }), { status: 400 });
          }
    
          const cleanEmail = data.email.trim().toLowerCase();
          let targetHierarchy = parseInt(data.hierarchy_level, 10);
          if (isNaN(targetHierarchy)) targetHierarchy = 5;
          const customRole = (data.role || 'staff').trim();
    
          // ── Hierarchy enforcement ──
          // Only Original Super Admin can bypass hierarchy rules
          if (!isOriginalSuperAdmin) {
            // Cannot create someone at same or higher level
            if (targetHierarchy <= callerHierarchy) {
              return new Response(JSON.stringify({
                error: `You can only create staff at a lower hierarchy level than your own (Level ${callerHierarchy})`
              }), { status: 403 });
            }
            // Cannot use protected role names
            if (isProtectedRoleName(customRole)) {
              return new Response(JSON.stringify({
                error: 'You are not authorized to assign this role name'
              }), { status: 403 });
            }
            // Prevent permission delegation escalation
            if (data.permissions && typeof data.permissions === 'object') {
              for (const [section, level] of Object.entries(data.permissions)) {
                if (level === 'manage' || level === 'view') {
                  const callerLevel = ctx.permissions[section];
                  if (callerLevel !== 'manage' && !(callerLevel === 'view' && level === 'view')) {
                    return new Response(JSON.stringify({ error: `You do not have permission to grant ${level} access to ${section}` }), { status: 403 });
                  }
                }
              }
            }
          }
    
          // Check for duplicate email
          const allStaff = await getStaff();
          const existing = allStaff.find((s: any) => s.email?.toLowerCase() === cleanEmail);
          if (existing) {
            return new Response(JSON.stringify({ error: 'An account with this email already exists' }), { status: 400 });
          }
    
          // Automatically assign recovery method based on hierarchy
          const automatedRecoveryMethod = targetHierarchy <= 1 ? 'contact_dev_or_email' : 'contact_admin';
    
          const cleanData = {
            ...data,
            email: cleanEmail,
            password: data.password ? hashPassword(data.password.trim()) : '',
            role: customRole,
            hierarchy_level: targetHierarchy,
            created_by: callerId,
            recovery_method: automatedRecoveryMethod,
          };
    
          const member = await saveStaffMember(cleanData);
          try { await logActivity(callerId, callerName, 'Created Staff Account', member.id || cleanEmail, { role: customRole, level: targetHierarchy }, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
          return new Response(JSON.stringify({ success: true, member }), { status: 200 });
        }
    
        if (action === 'update') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
    
          // Handle L0 Master Admin (owner) updates correctly
          if (id === 'staff-owner') {
            if (!isOriginalSuperAdmin) {
               return new Response(JSON.stringify({ error: 'Only the Original Super Admin can edit the Master Admin credentials' }), { status: 403 });
            }
            
            const currentSettings = await getSettings();
            let pc = currentSettings.pages_content || {};
            if (typeof pc === 'string') { try { pc = JSON.parse(pc); } catch {} }
            
            if (data.email) pc.super_admin_custom_email = data.email.trim().toLowerCase();
            if (data.password) pc.super_admin_custom_password_hash = hashPassword(data.password.trim());
            
            // Save back to settings
            const { saveSettings } = await import('../../../lib/database');
            await saveSettings({ pages_content: pc });
            
            try { await logActivity(callerId, callerName, 'Updated Master Admin Account', id, { updated_fields: Object.keys(data) }, request); } catch (logErr) {}
            
            return new Response(JSON.stringify({ success: true, member: { id: 'staff-owner', email: pc.super_admin_custom_email } }), { status: 200 });
          }
    
          // Get target staff member to check hierarchy
          if (!isOriginalSuperAdmin) {
            const allStaff = await getStaff();
            const target = allStaff.find((s: any) => s.id === id);
            if (target && target.hierarchy_level <= callerHierarchy) {
              return new Response(JSON.stringify({ error: 'You cannot edit a staff member at your level or above' }), { status: 403 });
            }
            // Check role name
            if (data.role && isProtectedRoleName(data.role)) {
              return new Response(JSON.stringify({ error: 'You are not authorized to assign this role name' }), { status: 403 });
            }
            // Check if trying to escalate hierarchy_level
            if (data.hierarchy_level !== undefined && parseInt(data.hierarchy_level, 10) <= callerHierarchy) {
              return new Response(JSON.stringify({ error: 'You cannot elevate a staff member to your level or above' }), { status: 403 });
            }
            // Prevent permission delegation escalation
            if (data.permissions && typeof data.permissions === 'object') {
              for (const [section, level] of Object.entries(data.permissions)) {
                if (level === 'manage' || level === 'view') {
                  const callerLevel = ctx.permissions[section];
                  if (callerLevel !== 'manage' && !(callerLevel === 'view' && level === 'view')) {
                    return new Response(JSON.stringify({ error: `You do not have permission to grant ${level} access to ${section}` }), { status: 403 });
                  }
                }
              }
            }
          }
    
          const { status, ...validData } = data;
    
          if (validData.email) {
            validData.email = validData.email.trim().toLowerCase();
            const allStaff = await getStaff();
            const existing = allStaff.find((s: any) => s.email?.toLowerCase() === validData.email && s.id !== id);
            if (existing) {
              return new Response(JSON.stringify({ error: 'This email is already in use by another account' }), { status: 400 });
            }
          }
          if (validData.password !== undefined) {
            validData.password = hashPassword(validData.password.trim());
          }
    
          const updated = await updateStaffMember(id, validData);
          if (!updated) return new Response(JSON.stringify({ error: 'Staff member not found' }), { status: 404 });
          try { await logActivity(callerId, callerName, 'Updated Staff Account', id, { updated_fields: Object.keys(validData) }, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
          return new Response(JSON.stringify({ success: true, member: updated }), { status: 200 });
        }
    
        if (action === 'toggle_status') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          if (data.is_primary) {
            return new Response(JSON.stringify({ error: 'Cannot deactivate the primary admin account' }), { status: 403 });
          }
          // Hierarchy check
          if (!isOriginalSuperAdmin) {
            const allStaff = await getStaff();
            const target = allStaff.find((s: any) => s.id === id);
            if (target && target.hierarchy_level <= callerHierarchy) {
              return new Response(JSON.stringify({ error: 'You cannot change status of a staff member at your level or above' }), { status: 403 });
            }
          }
          const updated = await updateStaffMember(id, { is_active: data.is_active });
          try { await logActivity(callerId, callerName, data.is_active ? 'Activated Staff' : 'Deactivated Staff', id, {}, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
          return new Response(JSON.stringify({ success: true, member: updated }), { status: 200 });
        }
    
        if (action === 'delete') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          if (data.is_primary) {
            return new Response(JSON.stringify({ error: 'Cannot delete the primary admin account' }), { status: 403 });
          }
          // Hierarchy check
          if (!isOriginalSuperAdmin) {
            const allStaff = await getStaff();
            const target = allStaff.find((s: any) => s.id === id);
            if (target && target.hierarchy_level <= callerHierarchy) {
              return new Response(JSON.stringify({ error: 'You cannot delete a staff member at your level or above' }), { status: 403 });
            }
          }
          await deleteStaffMember(id);
          try { await logActivity(callerId, callerName, 'Deleted Staff Account', id, {}, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'change_password') {
          // Self password change
          if (!id || !data.current_password || !data.new_password) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
          }
          const allStaff = await getStaff();
          const member = allStaff.find((s: any) => s.id === id);
          if (!member) return new Response(JSON.stringify({ error: 'Staff member not found' }), { status: 404 });
          const hashedCurrentInput = hashPassword(data.current_password.trim());
          if (member.password?.trim() !== hashedCurrentInput) {
            return new Response(JSON.stringify({ error: 'Current password is incorrect' }), { status: 401 });
          }
          await updateStaffMember(id, { password: hashPassword(data.new_password.trim()) });
          try { await logActivity(callerId, callerName, 'Changed Own Password', id, {}, request); } catch (logErr) { console.error('[ActivityLog] Non-critical logging failed:', logErr); }
    
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error: any) {
        console.error('Staff API error:', error);
        return new Response(JSON.stringify({
          error: 'Internal server error',
          details: error?.message || error?.details || JSON.stringify(error)
        }), { status: 500 });
      }
  });
};
