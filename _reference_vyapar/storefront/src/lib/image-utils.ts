export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'webp' | 'avif' | 'png' | 'origin';
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Automatically converts a Supabase raw object URL into a highly optimized
 * image rendering URL using Supabase's built-in image transformations.
 * Reduces LCP significantly.
 */
export const optimizeImage = (url: string, options: ImageOptions = {}): string => {
  if (!url) return url;
  
  // Use Vercel Edge Cache via Astro's built-in /_image endpoint for remote images.
  // This completely bypasses Supabase Image Transformation (saving egress) 
  // Skip SVG files to prevent rasterization by Vercel Image Optimizer
  if (url.toLowerCase().includes('.svg')) return url;
  
  if (url.includes('.supabase.co/storage/v1/object/public/')) {
    const params = new URLSearchParams();
    
    // Astro expects the absolute source URL in the 'href' parameter
    params.append('href', url);
    
    // Apply Vercel/Astro optimization parameters
    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    
    if (options.quality) params.append('q', options.quality.toString());
    else params.append('q', '80');
    
    if (options.format) params.append('f', options.format);
    else params.append('f', 'webp');
    
    // Fallback if href parsing fails on server side in some Astro contexts, 
    // it requires absolute URL path. But relative `/_image` works on client and server 
    // in SSR mode when rendering HTML.
    return `/_image?${params.toString()}`;
  }

  return url;
};
