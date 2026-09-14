import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin, rawSupabaseAdmin, clearCached } from '../../../lib/database';
import { getPermissionContext, canCreateStores } from '../../../lib/permissions';
import { logAdminActivity } from '../../../lib/activity-logger';
import { validateCsrfToken } from '../../../lib/csrf';
import { storeContext } from "../../../lib/storeContext";

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

export const POST: APIRoute = async ({ request, cookies, redirect , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canCreateStores(ctx)) {
        return new Response('Unauthorized', { status: 401 });
      }
    const formData = await request.formData();
    const store_id = formData.get('store_id')?.toString();
    const action = formData.get('action')?.toString();
    const csrfToken = formData.get('_csrf')?.toString();
    if (!validateCsrfToken(request, cookies, csrfToken)) {
        return redirect('/super-admin/stores?error=csrf_invalid');
      }
    if (!store_id || !action) {
        return new Response('Missing required fields', { status: 400 });
      }
    if (action === 'assign_manager') {
        const staff_name = formData.get('staff_name')?.toString();
        const staff_phone = formData.get('staff_phone')?.toString();
        
        if (!staff_name || !staff_phone) {
          return new Response('Missing manager details', { status: 400 });
        }
    
        const permissions = {
          orders: formData.get('perm_orders') === 'manage' ? 'manage' : 'none',
          products: formData.get('perm_products') === 'manage' ? 'manage' : 'none',
          customers: formData.get('perm_customers') === 'manage' ? 'manage' : 'none',
          settings: formData.get('perm_settings') === 'manage' ? 'manage' : 'none',
        };
    
        const { error } = await supabaseAdmin.from(TABLES.STAFF).insert({
          store_id,
          name: staff_name,
          phone: staff_phone,
          role: 'staff',
          permissions: JSON.stringify(permissions),
          is_active: true
        });
    
        if (error) {
          console.error(`Error assigning manager to store ${store_id}:`, error);
          return new Response('Failed to assign manager', { status: 500 });
        }
    
        await logAdminActivity(ctx, request, 'Assigned Store Manager', `Manager: ${staff_name} | Store ID: ${store_id}`);
    
        return redirect('/super-admin/stores');
      }
    let statusValue = 'active';
    if (action === 'suspend') statusValue = 'suspended';
    if (action === 'delete') statusValue = 'deleted';
    
    if (action === 'toggle_qcommerce_theme') {
        if (!rawSupabaseAdmin) {
            return new Response('Admin client not available', { status: 500 });
        }
        
        // 'website_configuration' is NOT a direct column.
        // It is stored as a nested key inside the 'pages_content' JSONB column.
        // So we must read/write 'pages_content' and update website_configuration inside it.

        // Step 1: Fetch current pages_content
        let pagesContent: any = {};
        let existingWebConfig: any = {};

        try {
            const { data: settingsRow } = await rawSupabaseAdmin
                .from(TABLES.SETTINGS)
                .select('pages_content')
                .eq('store_id', store_id)
                .maybeSingle();
            
            if (settingsRow?.pages_content) {
                let raw = settingsRow.pages_content;
                if (typeof raw === 'string') {
                    raw = JSON.parse(raw);
                }
                pagesContent = raw || {};
                
                if (pagesContent.website_configuration) {
                    const wc = pagesContent.website_configuration;
                    existingWebConfig = typeof wc === 'string' ? JSON.parse(wc) : wc;
                }
            }
        } catch(e) {
            // Start fresh if parse fails
            console.error('Failed to parse pages_content during toggle_qcommerce_theme:', e);
        }
        
        // Step 2: Toggle theme inside website_configuration
        const newTheme = existingWebConfig.theme === 'qcommerce' ? 'standard' : 'qcommerce';
        const newWebConfig = { ...existingWebConfig, theme: newTheme };
        
        // Step 3: Merge back into pages_content
        const updatedPagesContent = {
            ...pagesContent,
            website_configuration: JSON.stringify(newWebConfig)
        };

        // Step 4: Update pages_content column
        const { data: updateData, error: updateErr } = await rawSupabaseAdmin
            .from(TABLES.SETTINGS)
            .update({ pages_content: updatedPagesContent })
            .eq('store_id', store_id)
            .select('store_id');

        // If no row was updated (settings row doesn't exist yet), insert it
        if (!updateErr && (!updateData || updateData.length === 0)) {
            const { error: insertErr } = await rawSupabaseAdmin
                .from(TABLES.SETTINGS)
                .insert({ store_id, pages_content: updatedPagesContent });
            if (insertErr) {
                console.error(`Insert settings error for store ${store_id}:`, insertErr);
                return new Response(`Failed to save theme: ${insertErr.message}`, { status: 500 });
            }
        } else if (updateErr) {
            console.error(`Update settings error for store ${store_id}:`, updateErr);
            return new Response(`Failed to save theme: ${updateErr.message}`, { status: 500 });
        }

        clearCached(`settings_${store_id}`);
        await logAdminActivity(ctx, request, 'Toggled Theme', `Store ID: ${store_id}, New Theme: ${newTheme}`);
        return redirect('/super-admin/stores');
    }
    else if (action === 'set_theme') {
        const theme_name = formData.get('theme_name')?.toString() || 'standard';

        let existingWebConfig = {} as any;
        let pagesContent = {} as any;

        try {
            const { data: settingsRow } = await rawSupabaseAdmin
                .from(TABLES.SETTINGS)
                .select('pages_content')
                .eq('store_id', store_id)
                .maybeSingle();
            
            if (settingsRow?.pages_content) {
                let raw = settingsRow.pages_content;
                if (typeof raw === 'string') {
                    raw = JSON.parse(raw);
                }
                pagesContent = raw || {};
                
                if (pagesContent.website_configuration) {
                    const wc = pagesContent.website_configuration;
                    existingWebConfig = typeof wc === 'string' ? JSON.parse(wc) : wc;
                }
            }
        } catch(e) {
            console.error('Failed to parse pages_content during set_theme:', e);
        }
        
        const newWebConfig = { ...existingWebConfig, theme: theme_name };
        
        const updatedPagesContent = {
            ...pagesContent,
            website_configuration: JSON.stringify(newWebConfig)
        };

        const { data: updateData, error: updateErr } = await rawSupabaseAdmin
            .from(TABLES.SETTINGS)
            .update({ pages_content: updatedPagesContent })
            .eq('store_id', store_id)
            .select('store_id');

        if (!updateErr && (!updateData || updateData.length === 0)) {
            const { error: insertErr } = await rawSupabaseAdmin
                .from(TABLES.SETTINGS)
                .insert({ store_id, pages_content: updatedPagesContent });
            if (insertErr) {
                return new Response(`Failed to save theme: ${insertErr.message}`, { status: 500 });
            }
        } else if (updateErr) {
            return new Response(`Failed to save theme: ${updateErr.message}`, { status: 500 });
        }

        clearCached(`settings_${store_id}`);
        await logAdminActivity(ctx, request, 'Updated Theme', `Store ID: ${store_id}, New Theme: ${theme_name}`);
        return redirect('/super-admin/stores');
    }

    if (action === 'hard_delete') {
        // Manually cascade delete to avoid Foreign Key constraint errors
        for (const table of TENANT_TABLES) {
            try {
                await supabaseAdmin.from(table).delete().eq('store_id', store_id);
            } catch (err) {
                console.error(`Failed to cascade delete from ${table}:`, err);
            }
        }
        
        const { error } = await supabaseAdmin.from(TABLES.STORES).delete().eq('id', store_id);
        if (error) {
            console.error(`Error hard deleting store ${store_id}:`, error);
            return new Response('Failed to hard delete store', { status: 500 });
        }
        await logAdminActivity(ctx, request, 'Hard Deleted Store', `Store ID: ${store_id}`);
        return redirect('/super-admin/stores');
    }

    const { error } = await supabaseAdmin
        .from(TABLES.STORES)
        .update({
          status: statusValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', store_id);
    if (error) {
        console.error(`Error performing ${action} on store ${store_id}:`, error);
        return new Response('Failed to update store status', { status: 500 });
      }
    await logAdminActivity(ctx, request, 'Changed Store Status', `New Status: ${statusValue} | Store ID: ${store_id}`);
    return redirect('/super-admin/stores');
  });
};
