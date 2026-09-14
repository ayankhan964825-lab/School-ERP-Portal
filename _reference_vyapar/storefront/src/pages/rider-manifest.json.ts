import type { APIRoute } from 'astro';
import { getSettings } from '../lib/database';

export const GET: APIRoute = async ({ locals }) => {
  const storeId = locals?.storeId;
  const settings = await getSettings(storeId);
  
  const brandName = settings?.brand_name || 'Store';
  const riderTitle = `${brandName} Rider`;
  const riderIconUrl = settings?.rider_app_icon || settings?.brand_logo || settings?.logo_url || settings?.favicon_url || '';

  // Build icon src: Use dynamic image optimization for PWA icon
  const makeIconSrc = (size: number) => {
    if (riderIconUrl) {
      if (riderIconUrl.startsWith('http')) {
        return `/_image?href=${encodeURIComponent(riderIconUrl)}&w=${size}&h=${size}&f=png`;
      }
      return riderIconUrl;
    }
    // No fallback to static /icons/ — those are NutriDry-specific assets
    return null;
  };

  const manifest = {
    "name": riderTitle,
    "short_name": riderTitle,
    "description": `Rider Dashboard for ${brandName}`,
    "start_url": "/rider?source=pwa",
    "id": `rider-${storeId || 'default'}`,
    "scope": "/rider",
    "display": "standalone",
    "background_color": "#6b21a8",
    "theme_color": "#6b21a8",
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
      'Cache-Control': 'public, max-age=3600',
      'Vary': 'Host'
    }
  });
};

