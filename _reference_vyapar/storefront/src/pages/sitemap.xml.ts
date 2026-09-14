import type { APIRoute } from 'astro';
import { getProducts, getBlogPosts } from '../lib/database';
import { storeContext } from '../lib/storeContext';

export const GET: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: (locals as any).storeId }, async () => {
    try {
      const baseUrl = new URL(request.url).origin;
      const storeId = (locals as any).storeId;

    const products = await getProducts(storeId) || [];
    const blogPosts = await getBlogPosts(storeId) || [];

    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/products', priority: '0.9', changefreq: 'daily' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/blog', priority: '0.8', changefreq: 'weekly' },
      { url: '/bulk-order', priority: '0.8', changefreq: 'monthly' },
      { url: '/faq', priority: '0.6', changefreq: 'monthly' },
      { url: '/delivery', priority: '0.5', changefreq: 'monthly' },
      { url: '/sustainability', priority: '0.5', changefreq: 'monthly' },
      { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
      { url: '/terms', priority: '0.3', changefreq: 'yearly' },
      { url: '/refund-policy', priority: '0.4', changefreq: 'monthly' },
    ];

    const today = new Date().toISOString().split('T')[0];

    const productPages = products.map((p: any) => ({
      url: `/products/${p.slug || ''}`,
      priority: '0.85',
      changefreq: 'weekly',
      lastmod: p.updated_at || p.created_at || today,
      image: p.image || (p.slug ? `/products/${p.slug}.webp` : undefined),
      imageTitle: String(p.name || '')
    }));

    const blogPages = blogPosts
      .filter((p: any) => p.is_published)
      .map((p: any) => ({
        url: `/blog/${p.slug || ''}`,
        priority: '0.7',
        changefreq: 'monthly',
        lastmod: p.updated_at || p.created_at || today,
        image: p.cover_image || p.featured_image_url || undefined,
        imageTitle: String(p.title || '')
      }));

    const allPages = [
      ...staticPages.map(p => ({ ...p, lastmod: today })),
      ...productPages,
      ...blogPages,
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allPages
  .filter(page => page.url && page.url !== '/products/') // don't include broken slugs
  .map(
    page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${page.image ? `
    <image:image>
      <image:loc>${page.image.startsWith('http') ? page.image : baseUrl + page.image}</image:loc>
      ${page.imageTitle ? `<image:title>${page.imageTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>` : ''}
    </image:image>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap Generation Error:', error);
    // Return a valid fallback sitemap so Google doesn't completely fail
    const baseUrl = new URL(request.url).origin;
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc></url>
  <url><loc>${baseUrl}/products</loc></url>
</urlset>`;
    return new Response(fallbackXml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
  });
};
