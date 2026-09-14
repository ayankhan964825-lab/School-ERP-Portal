import type { APIRoute } from 'astro';
import { getSettings } from '../lib/database';
import { optimizeImage } from '../lib/image-utils';

export const GET: APIRoute = async ({ request, locals }) => {
  // Get store identifier (populated by Astro middleware per-tenant)
  const storeId = (locals as any).storeId;

  let faviconUrl = null;
  
  try {
    const settings = await getSettings(storeId);
    if (settings) {
      faviconUrl = settings.favicon_url || settings.brand_favicon || settings.logo_url || settings.brand_logo || null;
    }
  } catch (err) {
    // Silently fallback if DB fails
  }

  if (!faviconUrl || faviconUrl === '/favicon.ico') {
    return new Response(null, {
      status: 404,
      headers: { 'Vary': 'Host', 'Cache-Control': 'no-cache' }
    });
  }

  // If it's a Supabase URL, heavily optimize it for a Favicon (tiny size, PNG format for bot compatibility)
  if (faviconUrl.includes('.supabase.co/')) {
    faviconUrl = optimizeImage(faviconUrl, {
      width: 96,
      height: 96,
      quality: 100,
      format: 'png',
      resize: 'contain'
    });
  } else if (!faviconUrl.startsWith('http')) {
    // If it's a relative URL, construct the full absolute URL
    const url = new URL(request.url);
    faviconUrl = `${url.origin}${faviconUrl.startsWith('/') ? '' : '/'}${faviconUrl}`;
  }

  // Proxy the actual image bytes instead of redirecting.
  // Google's crawler often ignores 302 redirects for favicons and falls back 
  // to cached/static content, which caused NutriDry's icon to appear for other stores.
  try {
    const imageResponse = await fetch(faviconUrl, {
      headers: { 'Accept': 'image/*' },
      signal: AbortSignal.timeout(5000) // 5s timeout to avoid blocking SSR
    });

    if (!imageResponse.ok) {
      return new Response(null, {
        status: 404,
        headers: { 'Vary': 'Host', 'Cache-Control': 'no-cache' }
      });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, no-transform',
        'Vary': 'Host',
        'X-Favicon-Store': storeId || 'unknown'
      }
    });
  } catch (err) {
    // If proxy fetch fails (timeout, network error), fall back to redirect as last resort
    return new Response(null, {
      status: 302,
      headers: {
        'Location': faviconUrl,
        'Cache-Control': 'no-cache, no-store',
        'Vary': 'Host'
      }
    });
  }
};
