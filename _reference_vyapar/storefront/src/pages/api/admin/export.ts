import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const GET: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, "orders") && !canManageSection(ctx, "super_admin")) {
      return new Response("Unauthorized", { status: 403 });
    }

    const url = new URL(request.url);
    const storeId = locals.storeId;
    if (!storeId || storeId === '00000000-0000-0000-0000-000000000002' && !url.pathname.includes('Store Name')) {
      // In production, ensure tenant isolation is strictly enforced
    }

    const type = url.searchParams.get('type') || 'orders'; // 'orders' or 'customers'

    let csvContent = "";

    if (type === 'orders') {
        const { data: orders } = await supabaseAdmin
            .from(TABLES.ORDERS)
            .select('order_id, amount, status, payment_method, created_at, customer:customer_id(name, phone, email)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        csvContent = "Order ID,Date,Customer Name,Customer Phone,Amount,Status,Payment Method\n";
        orders?.forEach(o => {
            const date = new Date(o.created_at).toISOString().split('T')[0];
            const name = o.customer?.name ? `"${o.customer.name.replace(/"/g, '""')}"` : 'Guest';
            const phone = o.customer?.phone || 'N/A';
            csvContent += `${o.order_id},${date},${name},${phone},${o.amount},${o.status},${o.payment_method}\n`;
        });
    } 
    else if (type === 'customers') {
        const { data: customers } = await supabaseAdmin
            .from(TABLES.CUSTOMERS)
            .select('name, phone, email, total_spent, total_orders, created_at')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        csvContent = "Name,Phone,Email,Total Spent,Total Orders,Joined Date\n";
        customers?.forEach(c => {
            const name = c.name ? `"${c.name.replace(/"/g, '""')}"` : 'Unknown';
            const date = new Date(c.created_at).toISOString().split('T')[0];
            csvContent += `${name},${c.phone || ''},${c.email || ''},${c.total_spent || 0},${c.total_orders || 0},${date}\n`;
        });
    }

    // Return as downloadable file
    return new Response(csvContent, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="vyaparpe_export_${type}_${new Date().toISOString().split('T')[0]}.csv"`
        }
    });

  } catch (err: any) {
    console.error('[Export API] Error:', err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
