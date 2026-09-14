import type { APIRoute } from 'astro';
import { getSettings } from '../lib/database';

export const GET: APIRoute = async ({ locals }) => {
  const storeId = locals?.storeId;
  const settings = await getSettings(storeId);
  
  const brandName = settings?.brand_name || 'Your Brand';
  const description = settings?.global_seo_desc || settings?.seo_default_description || `${brandName} - Shop online`;
  const logoUrl = settings?.logo_url || settings?.brand_logo || null;
  const faviconUrl = settings?.favicon_url || settings?.brand_favicon || null;
  
  let themeColor = '#2D5A27';
  try {
     if (settings?.website_theme) {
       const parsed = typeof settings.website_theme === 'string' ? JSON.parse(settings.website_theme) : settings.website_theme;
       if (parsed.custom_colors && parsed.custom_colors.primary) {
          themeColor = parsed.custom_colors.primary;
       }
     }
  } catch(e) {}

  const getIconType = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.svg')) return 'image/svg+xml';
    if (lowerUrl.endsWith('.webp')) return 'image/webp';
    if (lowerUrl.endsWith('.ico')) return 'image/x-icon';
    if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) return 'image/jpeg';
    return 'image/png';
  };

  // Build icon src: Use dynamic image optimization for PWA icon
  const makeIconSrc = (size: number) => {
    const src = faviconUrl ? faviconUrl : (logoUrl ? logoUrl : null);
    if (src) {
      // Dynamic optimization (Supabase or external HTTP URL)
      if (src.startsWith('http')) {
        return `/_image?href=${encodeURIComponent(src)}&w=${size}&h=${size}&f=png`;
      }
      // Internal custom asset
      return src;
    }
    // Return null if no icon exists
    return null;
  };

  // Shortcut icons (use favicon, fallback to logo)
  const makeShortcutIcon = (size: number) => {
    const src = faviconUrl ? faviconUrl : (logoUrl ? logoUrl : null);
    if (src) {
      if (src.startsWith('http')) {
        return `/_image?href=${encodeURIComponent(src)}&w=${size}&h=${size}&f=png`;
      }
      return src;
    }
    return null;
  };

  const manifest = {
    "name": brandName,
    "short_name": brandName,
    "description": description,
    "start_url": "/?source=pwa",
    "id": `storefront-${storeId || 'default'}`,
    "scope": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": themeColor,
    "orientation": "portrait-primary",
    "lang": "en",
    "dir": "ltr",
    "categories": settings?.pwa_categories ? JSON.parse(settings.pwa_categories) : ["shopping"],
    "prefer_related_applications": false,
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
    ].filter(Boolean),
    "shortcuts": [
      {
        "name": "Browse Products",
        "short_name": "Products",
        "description": `View all ${brandName} products`,
        "url": "/products?source=shortcut",
        "icons": makeShortcutIcon(96) ? [{ "src": makeShortcutIcon(96), "sizes": "96x96", "type": "image/png" }] : []
      },
      {
        "name": "Track My Order",
        "short_name": "Track",
        "description": "Track your order status",
        "url": "/track-order?source=shortcut",
        "icons": makeShortcutIcon(96) ? [{ "src": makeShortcutIcon(96), "sizes": "96x96", "type": "image/png" }] : []
      }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Vary': 'Host'
    }
  });
}
