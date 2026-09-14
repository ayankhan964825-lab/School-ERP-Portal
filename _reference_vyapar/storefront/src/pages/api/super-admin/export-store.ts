import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canCreateStores } from '../../../lib/permissions';
import JSZip from 'jszip';

const TENANT_TABLES = [
  'products', 'product_variants', 'categories', 'orders', 'order_items', 
  'customers', 'addresses', 'settings', 'flash_sales', 'blog_posts', 
  'hero_slides', 'coupons', 'affiliates', 'affiliate_offers', 'wallets', 
  'wallet_transactions', 'payouts', 'notifications', 'reviews', 'staff',
  'feedback', 'bulk_inquiries', 'shipping_zones', 'ndr_logs',
  'expenses', 'remittances', 'milestone_offers', 'auth_rate_limits',
  'marketplace_listings', 'marketplace_applications', 'payout_requests', 'store_service_requests', 'activity_logs',
  'newsletter_subscribers', 'password_recovery_requests',
  'locations', 'inventory_levels', 'inventory_transactions', 'shipping_rates', 'tax_settings'
];

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  let str = '';
  if (typeof val === 'object') {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCSV).join(',');
  const rows = data.map(item => headers.map(h => escapeCSV(item[h])).join(','));
  return [headerRow, ...rows].join('\n');
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const ctx = getPermissionContext(cookies);
  
  if (!canCreateStores(ctx)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const storeId = url.searchParams.get('store_id');
  if (!storeId) {
    return new Response('Missing store_id', { status: 400 });
  }

  try {
    const zip = new JSZip();

    for (const table of TENANT_TABLES) {
      // Use raw supabaseAdmin bypass to query across tenant isolation explicitly by specifying store_id
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('store_id', storeId);

      if (error) {
        console.error(`Error exporting table ${table}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        const csvContent = toCSV(data);
        zip.file(`${table}.csv`, csvContent);
      }
    }

    // Include the main store record as well
    const { data: storeData } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', storeId);
      
    if (storeData && storeData.length > 0) {
      zip.file(`_store_profile.csv`, toCSV(storeData));
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="store_${storeId}_full_export.zip"`
      }
    });
  } catch (error: any) {
    console.error('Error generating ZIP export:', error);
    return new Response(`Export failed: ${error.message}`, { status: 500 });
  }
};
