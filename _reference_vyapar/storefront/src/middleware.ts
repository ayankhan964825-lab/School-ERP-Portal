import { defineMiddleware } from 'astro:middleware';
import { verifyAdminSession } from './lib/permissions';
import { supabase } from './lib/database';
import { storeContext } from './lib/storeContext';
import { logger } from './lib/logger';

// ── In-Memory Tenant Resolution Cache (TRD Section 4) ──
// Avoids Supabase RPC call on every request. 2-minute TTL.
const TENANT_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const tenantCacheBySubdomain = new Map<string, { storeId: string; subdomain: string; timestamp: number }>();
const tenantCacheByDomain = new Map<string, { storeId: string; subdomain: string; timestamp: number }>();

function getCachedTenant(hostname: string, type: 'subdomain' | 'domain'): string | null {
  const cache = type === 'subdomain' ? tenantCacheBySubdomain : tenantCacheByDomain;
  const entry = cache.get(hostname);
  if (entry && (Date.now() - entry.timestamp) < TENANT_CACHE_TTL) {
    return entry.storeId;
  }
  if (entry) cache.delete(hostname); // Expired
  return null;
}

function setCachedTenant(key: string, storeId: string, subdomain: string, type: 'subdomain' | 'domain') {
  const cache = type === 'subdomain' ? tenantCacheBySubdomain : tenantCacheByDomain;
  cache.set(key, { storeId, subdomain, timestamp: Date.now() });
}

// Static asset extensions — skip middleware entirely (edge_cases.md #3)
const STATIC_EXTENSIONS = /\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|eot|map|json|xml|txt|pdf|mp4|webm)$/i;

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url.pathname;
  const hostname = context.url.hostname;

  // 0. Payload Size Protection (DDoS / RAM Exhaustion fix)
  // Ensures attackers cannot send 500MB+ JSON files that crash the Node.js process (OOM)
  if (context.request.method === 'POST' || context.request.method === 'PUT' || context.request.method === 'PATCH') {
    const contentLength = context.request.headers.get('content-length');
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      const isFileUploadRoute = url.includes('/products') || url.includes('/upload') || url.includes('/update-platform-settings') || url.includes('/hero');
      const MAX_PAYLOAD_SIZE = isFileUploadRoute ? 250 * 1024 * 1024 : 5 * 1024 * 1024; // 250MB for forms/images/videos, 5MB for general POST
      
      if (sizeBytes > MAX_PAYLOAD_SIZE) {
        logger.warn('MALICIOUS_PAYLOAD blocked', { 
          reason: 'Exceeded MAX_PAYLOAD_SIZE',
          sizeBytes, 
          limit: MAX_PAYLOAD_SIZE,
          path: url 
        });
        return new Response(JSON.stringify({ 
          error: 'Payload Too Large. Request exceeds maximum allowed security limit.' 
        }), { 
          status: 413, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }
  }

  // 1. Fast-fail for static assets — no tenant resolution needed
  // Note: manifest.json and admin-manifest.json are dynamic endpoints, so we let them through.
  if (
    (STATIC_EXTENSIONS.test(url) && !url.endsWith('manifest.json') && !url.endsWith('favicon.ico')) || 
    url.startsWith('/_astro/') || 
    url.startsWith('/assets/') || 
    url.startsWith('/fonts/')
  ) {
    return next();
  }

  const getSubdomainAndPlatform = (host: string) => {
    const platforms = ['vyaparpe.com', 'vyaparpe.in', 'vercel.app', 'localhost'];
    for (const p of platforms) {
      if (host.endsWith('.' + p)) {
        return { subdomain: host.slice(0, -(p.length + 1)), platform: p };
      }
    }
    return null;
  };

  // 1. Resolve Tenant (Store ID)
  // Default fallback is The NutriDry for local dev and direct deployment.
  let storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  let isMarketplace = false;
  let platformDomain = 'vyaparpe.com';

  // --- Normalise Hostname ---
  let lookupDomain = hostname;
  // Automatically strip 'www.' for tenant lookup
  if (lookupDomain.startsWith('www.')) {
    lookupDomain = lookupDomain.substring(4);
  }

  const subData = getSubdomainAndPlatform(lookupDomain);

  // Resolve tenant from database for ALL environments (including localhost)
  // On bare localhost/127.0.0.1 without a subdomain, the default storeId is kept.
  if (supabase) {
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (subData) {
      const { subdomain, platform } = subData;
      platformDomain = platform;

      // Check if this is the marketplace root (www.platform)
      if (subdomain === 'www' && (platform === 'vyaparpe.com' || platform === 'vyaparpe.in')) {
        isMarketplace = true;
        storeId = 'SUPER_ADMIN_BYPASS';
      } else {
        // Check cache first
        const cached = getCachedTenant(subdomain, 'subdomain');
        if (cached) {
          storeId = cached;
        } else {
          const { data } = await supabase.rpc('get_store_by_subdomain', { p_subdomain: subdomain });
          if (data && data.length > 0) {
            storeId = data[0].id;
            setCachedTenant(subdomain, storeId, subdomain, 'subdomain');
          } else if (!isLocalhost) {
            return new Response('Store not found, suspended, or deleted.', { status: 404 });
          }
          // On localhost with unrecognized subdomain, keep default storeId
        }
      }
    } else if (lookupDomain === 'vyaparpe.com' || lookupDomain === 'vyaparpe.in') {
      platformDomain = lookupDomain;
      isMarketplace = true;
    } else if (lookupDomain === 'thenutridry.com' || lookupDomain.includes('nutridry')) {
      storeId = '00000000-0000-0000-0000-000000000002';
    } else if (lookupDomain === 'treasureflavours.com' || lookupDomain === 'treasureflavour.com' || lookupDomain.includes('treasureflavour')) {
      storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
    } else if (!isLocalhost) {
      // Custom Domain extraction — check cache first (skip on bare localhost)
      const cached = getCachedTenant(lookupDomain, 'domain');
      if (cached) {
        storeId = cached;
      } else {
        const { data } = await supabase.rpc('get_store_by_custom_domain', { p_domain: lookupDomain });
        if (data && data.length > 0) {
          storeId = data[0].id;
          setCachedTenant(lookupDomain, storeId, data[0].subdomain || '', 'domain');
        } else {
          return new Response('Store not found, suspended, or deleted.', { status: 404 });
        }
      }
    }
    // else: bare localhost — keep default storeId (Store Name)
  }

  // --- IMPERSONATION OVERRIDE ---
  // Only apply impersonation if the user is visiting an Admin or Super Admin route. 
  // Storefront APIs and Pages must ALWAYS strictly resolve based on the domain to prevent cross-tenant orders/leaks.
  if (url.startsWith('/admin') || url.startsWith('/api/admin') || url.startsWith('/api/super-admin') || url.startsWith('/super-admin')) {
    let adminRole = context.cookies.get('admin_role')?.value || '';
    adminRole = adminRole.toLowerCase().replace(/ /g, '_');
    const adminId = context.cookies.get('admin_id')?.value;
    const adminSignature = context.cookies.get('admin_signature')?.value;
    const impersonateStoreId = context.cookies.get('admin_impersonate')?.value;

    if (adminRole === 'super_admin' && adminId && adminSignature && impersonateStoreId) {
       const impPermissionsCookie = context.cookies.get('admin_permissions')?.value || '%7B%7D';
       const impPermissionsStr = decodeURIComponent(impPermissionsCookie);
       if (verifyAdminSession(adminId, adminRole, adminSignature, 'SUPER_ADMIN_BYPASS', impPermissionsStr)) {
           storeId = impersonateStoreId;
           isMarketplace = false; // impersonating a specific store
       }
    }
  }

  // 2. Strict Routing & Security (Audit #1, #14)
  // Block /super-admin on non-platform domains (only platform domains should access super admin)
  if (url.startsWith('/super-admin')) {
    const isSuperAdminAllowed = lookupDomain === 'vyaparpe.com' || lookupDomain === 'vyaparpe.in' || lookupDomain === 'localhost' || lookupDomain.endsWith('.vercel.app');
    if (!isSuperAdminAllowed) {
      return context.redirect('/'); // Bounce back to storefront
    }
    // Grant special bypass ID so the Data Proxy allows cross-tenant queries
    storeId = 'SUPER_ADMIN_BYPASS';
  }

  // Grant proxy bypass ONLY to server-to-server webhooks and payment callbacks
  // NOTE: provision-tenant is NOT public — requires super_admin auth
  if (url.startsWith('/api/webhooks/') || url === '/api/checkout/phonepe-callback') {
    storeId = 'SUPER_ADMIN_BYPASS';
  }

  // Marketplace pages use SUPER_ADMIN_BYPASS for cross-store queries
  if (url.startsWith('/marketplace') || url.startsWith('/m/')) {
    isMarketplace = true;
    storeId = 'SUPER_ADMIN_BYPASS';
  }

  // Inject storeId and marketplace flag into Astro Context for all downstream API and page rendering
  context.locals.storeId = storeId;
  (context.locals as any).isMarketplace = isMarketplace;

  // Tenant admin panel routing logic
  if (url.startsWith('/admin') && !url.startsWith('/api/admin') && !url.endsWith('admin-manifest.json')) {
    // 1. Block root platform domain from accessing /admin
    if (isMarketplace && lookupDomain !== 'localhost') {
      return new Response('Store not found. Please log in from your specific store domain (e.g. store.vyaparpe.in/admin).', { status: 404 });
    }
  }
  // --- Cross-Tab Contamination Prevention ---
  if ((url.startsWith('/api/admin/') || url.startsWith('/api/super-admin/')) && 
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(context.request.method)) {
    
    // Read the expected tenant from the headers (fetch calls) or query params (form POSTs)
    const urlObj = new URL(context.request.url);
    const expectedTenantId = context.request.headers.get('x-tenant-id') || urlObj.searchParams.get('_tenant_id');

    // If an expected tenant is provided but doesn't match the resolved storeId (from cookie/subdomain)
    // It means the user switched stores in another tab and the cookie was overwritten!
    if (expectedTenantId && expectedTenantId !== storeId) {
      if (storeId === 'SUPER_ADMIN_BYPASS') {
        // ALLOW master admin to impersonate stores
        storeId = expectedTenantId;
      } else {
        console.warn(`[SECURITY] Tenant Mismatch! Expected: ${expectedTenantId}, Resolved: ${storeId}`);
        return new Response(JSON.stringify({ 
          error: 'Tenant mismatch detected. You have switched stores in another tab. Please refresh this page to avoid corrupting data.' 
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }

  // 1. Protect Admin API Routes (/api/admin/*)
  if (url.startsWith('/api/admin/')) {
    const publicApiRoutes = [
      '/api/admin/login', 
      '/api/admin/logout', 
      '/api/admin/password-recovery',
      '/api/admin/request-otp',
      '/api/admin/verify-otp',
      '/api/admin/provision-tenant',
      '/api/admin/login-cross-store',
      '/api/admin/submit-lead',
    ];
    
    if (!publicApiRoutes.includes(url)) {
      const adminId = context.cookies.get('admin_id')?.value || '';
      let adminRole = context.cookies.get('admin_role')?.value || '';
      adminRole = adminRole.toLowerCase().replace(/ /g, '_');
      const signature = context.cookies.get('admin_signature')?.value || '';
      const permissionsCookie = context.cookies.get('admin_permissions')?.value || '%7B%7D';
      const permissionsStr = decodeURIComponent(permissionsCookie);

      const isValid = verifyAdminSession(adminId, adminRole, signature, storeId, permissionsStr);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Unauthorized. Admin authentication required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }

  // 2. Protect Super Admin API Routes (/api/super-admin/*)
  if (url.startsWith('/api/super-admin/')) {
    const adminId = context.cookies.get('admin_id')?.value || '';
    let adminRole = context.cookies.get('admin_role')?.value || '';
    adminRole = adminRole.toLowerCase().replace(/ /g, '_');
    const signature = context.cookies.get('admin_signature')?.value || '';
    const permissionsCookie = context.cookies.get('admin_permissions')?.value || '%7B%7D';
    const permissionsStr = decodeURIComponent(permissionsCookie);

    if (adminRole !== 'super_admin' || !verifyAdminSession(adminId, adminRole, signature, 'SUPER_ADMIN_BYPASS', permissionsStr)) {
      return new Response(JSON.stringify({ error: 'Forbidden. Super Admin access required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 3. Protect Admin UI Pages (/admin/*)
  if (url.startsWith('/admin') && !url.startsWith('/api/admin') && !url.endsWith('admin-manifest.json')) {
    const publicPages = ['/admin/login', '/admin/password-recovery', '/admin/forgot-password'];
    const isPublicPage = publicPages.some(page => url === page || url === `${page}/`);
    
    if (!isPublicPage) {
      const adminId = context.cookies.get('admin_id')?.value || '';
      let adminRole = context.cookies.get('admin_role')?.value || '';
      adminRole = adminRole.toLowerCase().replace(/ /g, '_');
      const signature = context.cookies.get('admin_signature')?.value || '';
      const permissionsCookie = context.cookies.get('admin_permissions')?.value || '%7B%7D';
      const permissionsStr = decodeURIComponent(permissionsCookie);

      if (!verifyAdminSession(adminId, adminRole, signature, storeId, permissionsStr)) {
        context.cookies.delete('admin_auth', { path: '/' });
        context.cookies.delete('admin_id', { path: '/' });
        context.cookies.delete('admin_role', { path: '/' });
        context.cookies.delete('admin_signature', { path: '/' });
        return context.redirect('/admin/login');
      }
    }
  }

  // Wrap the entire request context with AsyncLocalStorage to prevent prop-drilling store_id
  const response = await storeContext.run({ storeId }, async () => {
    return await next();
  });

  // 5. Strict Content Security Policy (Audit #31)
  // Blocks Stored XSS in Marketplace / User-generated content
  response.headers.set('Content-Security-Policy', "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'; object-src 'none';");
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Prevent caching on admin pages
  if (url.startsWith('/admin') || url.startsWith('/api/admin')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
});
