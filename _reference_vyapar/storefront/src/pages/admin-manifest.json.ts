import type { APIRoute } from 'astro';
import { getSettings } from '../lib/database';

export const GET: APIRoute = async ({ locals }) => {
  const storeId = locals?.storeId;
  const settings = await getSettings(storeId);
  
  const adminTitleRaw = settings?.admin_title || 'Your Brand';
  const adminTitle = adminTitleRaw.toLowerCase().includes('admin') ? adminTitleRaw : `${adminTitleRaw} Admin`;
  const adminLogoUrl = settings?.admin_logo_url || settings?.brand_logo || settings?.logo_url || settings?.favicon_url || '';

  // Build icon src: Use dynamic image optimization for PWA icon
  const makeIconSrc = (size: number) => {
    if (adminLogoUrl) {
      if (adminLogoUrl.startsWith('http')) {
        return `/_image?href=${encodeURIComponent(adminLogoUrl)}&w=${size}&h=${size}&f=png`;
      }
      return adminLogoUrl;
    }
    // No fallback to static /icons/ — those are NutriDry-specific assets
    return null;
  };

  const manifest = {
    "name": adminTitle,
    "short_name": adminTitle,
    "description": `Admin Dashboard for ${adminTitleRaw}`,
    "start_url": "/admin?source=pwa",
    "id": `admin-${storeId || 'default'}`,
    "scope": "/admin",
    "display": "standalone",
    "background_color": "#111827",
    "theme_color": "#111827",
    "orientation": "portrait-primary",
    "icons": [
      makeIconSrc(192) ? {
        "src": makeIconSrc(192),
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
      } : null,
      makeIconSrc(512) ? {
        "src": makeIconSrc(512),
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      } : null
    ].filter(Boolean)
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Vary': 'Host'
    }
  });
}

