import type { APIRoute } from 'astro';
import { getStorefrontProducts } from '../../lib/database';

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const url = new URL(request.url);
    const rawLimit = parseInt(url.searchParams.get('limit') || '0', 10);
    const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
    
    // Hacker Audit Fix: Cap maximum limit to prevent DoS, handle NaN gracefully
    const limit = isNaN(rawLimit) ? 0 : Math.min(rawLimit, 100);
    const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);
    
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort');
    
    // Only pass limit and offset if limit > 0
    let finalLimit = limit > 0 ? limit : undefined;
    let finalOffset = limit > 0 ? (page - 1) * limit : undefined;
    
    let categorySlugs = undefined;
    if (category && category !== 'all') {
      categorySlugs = category.split(',');
    }
    
    let products = await getStorefrontProducts(locals.storeId, cookies.get('delivery_pincode')?.value, cookies.get('qc_eligible')?.value, finalLimit, finalOffset, categorySlugs, search || undefined, sort || undefined);
    
    // Hacker Audit Fix: Sanitize internal data to prevent B2B pricing leaks to retail customers
    products = products.map((p: any) => {
      const sanitized = { ...p };
      delete sanitized.b2b_variants; // Never expose B2B wholesale prices on public endpoints
      if (sanitized.variants) {
        sanitized.variants = sanitized.variants.filter((v: any) => !v.is_hidden).map((v: any) => {
          const sVar = { ...v };
          delete sVar.is_b2b;
          return sVar;
        });
      }
      return sanitized;
    });
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Optional caching headers for performance
        'Cache-Control': 'public, max-age=60, s-maxage=300'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch products' }), { status: 500 });
  }
};
