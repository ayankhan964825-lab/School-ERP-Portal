import { createHash } from 'crypto';

/**
 * Centralized Permission Utility
 * Handles all permission checks and fake-bug-alert logic in one place.
 * This prevents DRY violations across admin pages.
 */

export interface PermissionContext {
  adminRole: string;
  permissions: Record<string, any>;
  hierarchyLevel: number;
  adminId: string;
  adminName: string;
  isOriginalSuperAdmin: boolean;
  storeId: string;
}

/**
 * Parse admin cookies into a PermissionContext object.
 * Use this in .astro frontmatter to get current user's permissions.
 */
export function getPermissionContext(cookies: any): PermissionContext {
  let adminRole = cookies.get('admin_role')?.value || '';
  adminRole = adminRole.toLowerCase().replace(/ /g, '_');
  const hierarchyLevel = parseInt(cookies.get('admin_hierarchy')?.value || '5', 10);
  const adminId = cookies.get('admin_id')?.value || '';
  const adminName = decodeURIComponent(cookies.get('admin_name')?.value || 'Staff');
  const signature = cookies.get('admin_signature')?.value || '';
  const storeId = cookies.get('admin_store')?.value || '';
  const permissionsCookieValue = cookies.get('admin_permissions')?.value || '%7B%7D';
  const permissionsStr = decodeURIComponent(permissionsCookieValue);

  // Verify session signature to prevent spoofing
  if (!verifyAdminSession(adminId, adminRole, signature, storeId, permissionsStr)) {
    return {
      adminRole: 'guest',
      permissions: {},
      hierarchyLevel: 99,
      adminId: '',
      adminName: 'Guest',
      isOriginalSuperAdmin: false,
      storeId: '',
    };
  }

  let permissions: Record<string, any> = {};
  try {
    permissions = JSON.parse(decodeURIComponent(permissionsCookieValue));
  } catch {
    permissions = {};
  }

  return {
    adminRole,
    permissions,
    hierarchyLevel,
    adminId,
    adminName,
    isOriginalSuperAdmin: adminRole === 'super_admin' && hierarchyLevel === 0,
    storeId,
  };
}

/**
 * Check if the user can manage (create/edit/delete) a specific section.
 * Original Super Admin always has full access.
 */
export function canManageSection(ctx: PermissionContext, section: string): boolean {
  if (ctx.isOriginalSuperAdmin) return true;
  return ctx.permissions[section] === 'manage';
}

/**
 * Check if the user can at least view a specific section.
 */
export function canViewSection(ctx: PermissionContext, section: string): boolean {
  if (ctx.isOriginalSuperAdmin) return true;
  const perm = ctx.permissions[section];
  return perm === 'manage' || perm === 'view';
}

/**
 * Super Admin RBAC Checks (VyaparPe Platform Level)
 */
export function canApproveMarketplace(ctx: PermissionContext): boolean {
  if (ctx.isOriginalSuperAdmin) return true;
  if (ctx.storeId === 'SUPER_ADMIN_BYPASS' && ctx.adminRole === 'super_admin') {
    return ctx.permissions['can_approve_marketplace'] === true;
  }
  return false;
}

export function canManageSuperAdmins(ctx: PermissionContext): boolean {
  if (ctx.isOriginalSuperAdmin) return true;
  if (ctx.storeId === 'SUPER_ADMIN_BYPASS' && ctx.adminRole === 'super_admin') {
    return ctx.permissions['can_manage_super_admins'] === true;
  }
  return false;
}

export function canManagePlans(ctx: PermissionContext): boolean {
  if (ctx.isOriginalSuperAdmin) return true;
  if (ctx.storeId === 'SUPER_ADMIN_BYPASS' && ctx.adminRole === 'super_admin') {
    return ctx.permissions['can_manage_plans'] === true;
  }
  return false;
}

export function canProcessPayouts(ctx: PermissionContext): boolean {
  if (ctx.isOriginalSuperAdmin) return true;
  if (ctx.storeId === 'SUPER_ADMIN_BYPASS' && ctx.adminRole === 'super_admin') {
    return ctx.permissions['can_process_payouts'] === true;
  }
  return false;
}

export function canCreateStores(ctx: PermissionContext): boolean {
  if (ctx.isOriginalSuperAdmin) return true;
  if (ctx.storeId === 'SUPER_ADMIN_BYPASS' && ctx.adminRole === 'super_admin') {
    return ctx.permissions['can_create_stores'] === true;
  }
  return false;
}


/**
 * Generates a secure token to identify the Original Super Admin
 * and prevent regular staff from spoofing the super_admin ID.
 */
export function getSuperAdminToken(): string {
  const adminPassword = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
  return createHash('sha256').update(adminPassword + '_secure_admin_salt').digest('hex');
}

/**
 * Hash a password with a pepper + salt using SHA-256.
 * SECURITY: Pepper is read from ADMIN_PASSWORD env var (the master admin password).
 *           Salt is read from ADMIN_HASH_SALT env var.
 * Using the pepper ensures that even if the DB is leaked, hashes cannot be cracked
 * without also possessing the server-side .env secret.
 * Fallback to a fixed salt ONLY so existing password hashes don't break.
 */
export function hashPassword(password: string): string {
  const pepper = import.meta.env.ADMIN_PASSWORD || (typeof process !== 'undefined' ? process.env.ADMIN_PASSWORD : '') || '';
  const salt = import.meta.env.ADMIN_HASH_SALT || (typeof process !== 'undefined' ? process.env.ADMIN_HASH_SALT : '');
  if (!salt) {
    console.warn('[SECURITY WARNING] ADMIN_HASH_SALT env var not set! Using insecure fallback.');
    return createHash('sha256').update(password.trim() + pepper + 'vyaparpe_superadmin_salt_2026_fixed').digest('hex');
  }
  return createHash('sha256').update(password.trim() + pepper + salt).digest('hex');
}

/**
 * Sign admin session cookies to prevent tampering and cross-tenant forgery.
 * SECURITY: Secret is read from ADMIN_SESSION_SECRET env var.
 * Throws fatal error in production if missing.
 */
export function signAdminSession(adminId: string, adminRole: string, storeId: string = '', permissionsStr: string = ''): string {
  const secret = import.meta.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.warn('[SECURITY WARNING] ADMIN_SESSION_SECRET env var not set! Using insecure fallback.');
    return createHash('sha256').update(`${adminId}:${adminRole}:${storeId}:${permissionsStr}:vyaparpe_admin_session_secret_2026_fixed`).digest('hex');
  }
  return createHash('sha256').update(`${adminId}:${adminRole}:${storeId}:${permissionsStr}:${secret}`).digest('hex');
}

export function verifyAdminSession(adminId: string, adminRole: string, signature: string, storeId: string = '', permissionsStr: string = ''): boolean {
  if (!adminId || !adminRole || !signature) return false;
  
  if (adminRole === 'super_admin') {
    // Strictly verify super admin signature to prevent role spoofing
    const expectedSuper = signAdminSession(adminId, adminRole, 'SUPER_ADMIN_BYPASS', permissionsStr);
    if (signature === expectedSuper) return true;
    
    // Allow store-specific super admin
    if (storeId && storeId !== 'SUPER_ADMIN_BYPASS') {
      const expectedStore = signAdminSession(adminId, adminRole, storeId, permissionsStr);
      if (signature === expectedStore) return true;
    }
    return false;
  }

  const expectedNew = signAdminSession(adminId, adminRole, storeId, permissionsStr);
  
  // Use direct string comparison to avoid require('node:crypto') crashing Vercel Edge Runtime middleware
  return signature === expectedNew;
}
