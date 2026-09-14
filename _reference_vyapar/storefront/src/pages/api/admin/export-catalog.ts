import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { getProducts } from '../../../lib/database';

export const GET: APIRoute = async ({ request, url , cookies }) => {
  const ctx = getPermissionContext(cookies);
  if (!canManageSection(ctx, 'products')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  try {
    const catalogData = await getProducts();

    const format = url.searchParams.get('format') || 'json';

    if (format === 'csv') {
      let csv = 'ID,Name,Category,Slug,Price(s),Rating,Short Description\n';
      
      catalogData.forEach((p: any) => {
        const sanitizeCsv = (val: string) => {
          if (!val) return '';
          let v = val.toString().replace(/"/g, '""');
          if (v.startsWith('=') || v.startsWith('+') || v.startsWith('-') || v.startsWith('@')) {
            v = "'" + v;
          }
          return `"${v}"`;
        };

        const id = p.id || '';
        const name = sanitizeCsv(p.name);
        const category = sanitizeCsv(p.category);
        const slug = sanitizeCsv(p.slug);
        const desc = sanitizeCsv(p.description);
        
        const prices = p.variants ? p.variants.map((v: any) => `₹${v.price} (${v.weight})`).join(' | ') : '';
        const escapedPrices = sanitizeCsv(prices);
        
        const rating = p.rating ? `${p.rating.value} (${p.rating.count})` : '';

        csv += `${id},${name},${category},${slug},${escapedPrices},${rating},${desc}\n`;
      });

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="catalog_export.csv"'
        }
      });
    }

    // Default to JSON
    return new Response(JSON.stringify(catalogData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="catalog_export.json"'
      }
    });

  } catch (error) {
    console.error('Error exporting catalog:', error);
    return new Response(JSON.stringify({ error: 'Failed to export catalog' }), { status: 500 });
  }
};
