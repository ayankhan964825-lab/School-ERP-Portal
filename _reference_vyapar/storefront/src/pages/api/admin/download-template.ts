import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  const ctx = getPermissionContext(cookies);
  if (!canManageSection(ctx, 'products')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  // CSV Template for bulk product upload
  // Columns match catalog_data.json structure
  const headers = [
    'name',
    'slug',
    'category',
    'description',
    'long_description',
    'bullet_points',       // Pipe-separated: "High in fiber|No additives|100% Natural"
    'badge',               // e.g. "Bestseller" or "New"
    'variant_1_weight',
    'variant_1_price',
    'variant_1_mrp',
    'variant_1_sku',
    'variant_2_weight',
    'variant_2_price',
    'variant_2_mrp',
    'variant_2_sku',
    'variant_3_weight',
    'variant_3_price',
    'variant_3_mrp',
    'variant_3_sku',
    'spec_shelf_life',
    'spec_storage',
    'spec_origin',
    'spec_processing',
    'spec_net_weight',
    'rating_value',
    'rating_count',
    'is_out_of_stock',     // TRUE or FALSE
    'tags',                // Pipe-separated: "organic|superfood|powder"
    'image_filename',      // e.g. "amla-powder.webp" (upload separately in ZIP)
    'is_q_commerce_only',  // TRUE or FALSE
    '_seo_title',
    '_seo_description',
    '_seo_keywords',
    '_section_Health Benefits',
    '_section_How to Use',
  ];

  // Example rows
  const exampleRows = [
    [
      'Amla Powder',
      'amla-powder',
      'superfoods',
      'Pure sun-dried amla (Indian Gooseberry) powder, rich in Vitamin C.',
      'Our Amla Powder is made from fresh Indian Gooseberries, carefully sun-dried and ground to a fine powder without any additives or preservatives. Rich in Vitamin C and antioxidants.',
      'Rich in Vitamin C|High Antioxidants|No Additives|100% Natural|FSSAI Certified',
      'Bestseller',
      '100g',
      '149',
      '199',
      'AMLA-100G',
      '250g',
      '299',
      '399',
      'AMLA-250G',
      '500g',
      '549',
      '699',
      'AMLA-500G',
      '12 Months',
      'Store in cool, dry place away from sunlight',
      'India',
      'Sun-dried, Stone-ground',
      'As per variant',
      '4.8',
      '124',
      'FALSE',
      'amla|vitamin c|superfood|immunity',
      'amla-powder.webp',
      'FALSE',
      'Amla Powder - Vitamin C Rich Superfood',
      'Boost your immunity naturally with our pure sun-dried Amla Powder.',
      'amla, immunity, superfood, vitamin c, natural',
      '<p>Improves immunity and skin health.</p><ul><li>Rich in Vitamin C</li><li>Natural detox</li></ul>',
      '<p>Mix 1 tsp with warm water and honey every morning.</p>',
    ],
    [
      'Premium Cotton T-Shirt',
      'premium-cotton-tshirt',
      'General',
      'Premium 100% cotton t-shirt. Soft, breathable, and comfortable.',
      'High quality t-shirt designed for everyday wear and maximum comfort.',
      '100% Cotton|Breathable fabric|Pre-shrunk|Classic fit|Unisex',
      'New',
      'Small / Blue',
      '499',
      '799',
      'TSHIRT-S-BLU',
      'Medium / Blue',
      '499',
      '799',
      'TSHIRT-M-BLU',
      'Large / Blue',
      '499',
      '799',
      'TSHIRT-L-BLU',
      'N/A',
      'Store in cool, dry place',
      'India',
      'Made from 100% organic cotton',
      'Machine wash cold',
      '4.5',
      '42',
      'FALSE',
      'clothing|cotton|tshirt|basic',
      'premium-cotton-tshirt.webp',
      'FALSE',
      'Premium Cotton T-Shirt | Blue',
      'Comfortable and breathable premium cotton t-shirt for everyday wear.',
      'tshirt, cotton, apparel, comfortable, breathable',
      '',
      '',
    ],
  ];

  // Build CSV string
  const csvLines = [
    headers.join(','),
    ...exampleRows.map(row =>
      row.map(cell => {
        // Wrap in quotes if contains comma
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ),
  ];

  const csv = csvLines.join('\r\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Store Name-bulk-upload-template.csv"',
      'Cache-Control': 'no-cache',
    },
  });
};
