import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canCreateStores } from '../../../lib/permissions';

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

export const GET: APIRoute = async ({ request, cookies }) => {
  const ctx = getPermissionContext(cookies);
  if (!canCreateStores(ctx)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('id');
      
    if (storesError) throw storesError;
    
    const validStoreIds = stores.map(s => s.id);
    const orphanedData: Record<string, number> = {};
    let totalOrphans = 0;

    for (const table of TENANT_TABLES) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('store_id');
        
      if (error || !data) {
        continue;
      }

      let orphansInTable = 0;
      for (const row of data) {
        if (row.store_id && !validStoreIds.includes(row.store_id)) {
          orphansInTable++;
        }
      }

      if (orphansInTable > 0) {
        orphanedData[table] = orphansInTable;
        totalOrphans += orphansInTable;
      }
    }

    return new Response(JSON.stringify({
      status: 'success',
      total_orphaned_rows: totalOrphans,
      breakdown: orphanedData,
      message: totalOrphans > 0 
        ? "Warning: Orphaned data found. These are rows belonging to deleted stores."
        : "Database is clean. No orphaned data found."
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
