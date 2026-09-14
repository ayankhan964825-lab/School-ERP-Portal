import type { APIRoute } from 'astro';
import { getStorefrontProducts, getSettings } from '../../../../lib/database';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const storeId = locals.storeId;
    if (!storeId) {
      return new Response('Store Context Missing', { status: 400 });
    }

    const [products, settings] = await Promise.all([
      getStorefrontProducts(storeId),
      getSettings(storeId)
    ]);

    const baseUrl = new URL(request.url).origin;
    const storeBrand = settings?.brand_name || settings?.store_name || 'VyaparPe Store';

    // Required Facebook Commerce Manager CSV Headers
    // https://www.facebook.com/business/help/120325381656392
    const headers = [
      'id',
      'item_group_id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand'
    ];
    
    const rows: string[] = [];
    
    // CSV escaping helper
    const escapeCSV = (str: string | null | undefined) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    };

    // Process all active products
    for (const product of products) {
      if (product.is_published === false) continue;

      const variantsToProcess = (product.variants && product.variants.length > 0) 
        ? product.variants 
        : [ { id: 'default', name: '', weight: '', price: 0, stock: 0, is_out_of_stock: false } ];

      for (const variant of variantsToProcess) {
        let isOutOfStock = product.is_in_stock === false;
        
        if (product.track_inventory) {
          if (variant.is_out_of_stock || variant.stock <= 0) {
            isOutOfStock = true;
          }
        }
        
        const inStock = isOutOfStock ? 'out of stock' : 'in stock';
        const priceStr = variant.price ? `${variant.price} INR` : '0 INR';
        
        let img = (variant.images && variant.images.length > 0) 
          ? variant.images[0] 
          : (product.images && product.images.length > 0)
            ? product.images[0]
            : (product.image ? product.image : (settings?.logo_url || `${baseUrl}/logo.png`));
        
        // Facebook requires absolute URLs for images
        if (img.startsWith('/')) {
          img = `${baseUrl}${img}`;
        }
          
        const link = `${baseUrl}/products/${product.slug}`;
        const titleSuffix = variant.weight ? ` - ${variant.weight}` : (variant.name && variant.name !== product.name ? ` - ${variant.name}` : '');
        const title = `${product.name}${titleSuffix}`;
        const desc = product.description || product.name;

        const variantIdStr = variant.id !== 'default' ? `${product.id}-${variant.id}` : product.id;
        const itemGroupId = product.id;

        rows.push([
          escapeCSV(variantIdStr),
          escapeCSV(itemGroupId),
          escapeCSV(title),
          escapeCSV(desc),
          inStock, // Facebook uses strict 'in stock' / 'out of stock' strings
          'new',
          escapeCSV(priceStr),
          escapeCSV(link),
          escapeCSV(img),
          escapeCSV(storeBrand)
        ].join(','));
      }
    }

    const csvContent = [headers.join(','), ...rows].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="catalogues.csv"'
      }
    });

  } catch (error: any) {
    console.error('Facebook Catalog Error:', error);
    return new Response('Error generating catalog feed', { status: 500 });
  }
};
