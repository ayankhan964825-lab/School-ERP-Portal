export function getOptimizedUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return url || '';
  
  const cloudflareCdnUrl = import.meta.env.PUBLIC_CLOUDFLARE_CDN_URL || process.env.PUBLIC_CLOUDFLARE_CDN_URL;
  const useVercelCdn = (import.meta.env.PUBLIC_USE_VERCEL_CDN || process.env.PUBLIC_USE_VERCEL_CDN) === 'true';
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl || !url.includes(supabaseUrl)) return url;

  // 1. Tier 1: Cloudflare
  if (cloudflareCdnUrl) {
    // Remove trailing slash if present in env var to prevent double slashes
    const cleanCdnUrl = cloudflareCdnUrl.replace(/\/$/, '');
    return url.replace(supabaseUrl, cleanCdnUrl);
  }

  // 2. Tier 2: Vercel Proxy
  if (useVercelCdn) {
    // Replaces https://[PROJECT_ID].supabase.co/storage/v1/object/public with /cdn/storage
    return url.replace(`${supabaseUrl}/storage/v1/object/public`, '/cdn/storage');
  }

  // 3. Tier 3: Default Supabase
  return url;
}

export function optimizeDataUrls<T>(data: T): T {
  if (!data) return data;

  if (typeof data === 'string') {
    return getOptimizedUrl(data) as any;
  }

  if (Array.isArray(data)) {
    return data.map(item => optimizeDataUrls(item)) as any;
  }

  if (typeof data === 'object' && data !== null) {
    const optimized: any = {};
    for (const key in data) {
      optimized[key] = optimizeDataUrls((data as any)[key]);
    }
    return optimized;
  }

  return data;
}
