import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const siteUrl = new URL(request.url).origin;
  
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
