import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate: Allow either Admin Session OR Vercel CRON Secret
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    if (!isCron) {
      const sessionStr = cookies.get('admin_session')?.value;
      if (!sessionStr) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      const session = JSON.parse(decodeURIComponent(sessionStr));
      const { data: adminUser } = await supabaseAdmin.from('stores').select('id').eq('id', session.storeId).single();
      if (!adminUser) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 1. Fetch all files from products/customer-uploads/
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('products')
      .list('customer-uploads', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError || !files) {
      return new Response(JSON.stringify({ error: 'Failed to list files' }), { status: 500 });
    }

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Fetch recent orders (last 30 days is enough since file is older than 1 day)
    // and do in-memory check to avoid PostgREST cast issues
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentOrders } = await supabaseAdmin
      .from('orders')
      .select('items')
      .gte('created_at', thirtyDaysAgo.toISOString());

    let deletedCount = 0;
    let checkedCount = 0;

    for (const file of files) {
      // Ignore placeholders or folder objects
      if (file.name === '.emptyFolderPlaceholder' || !file.name) continue;

      const fileCreatedAt = new Date(file.created_at);
      
      // Skip files uploaded within the last 24 hours to prevent deleting files in active carts
      if (fileCreatedAt > oneDayAgo) continue;

      checkedCount++;

      let isUsed = false;
      if (recentOrders) {
        for (const order of recentOrders) {
          const itemsStr = JSON.stringify(order.items || {});
          if (itemsStr.includes(file.name)) {
            isUsed = true;
            break;
          }
        }
      }

      if (!isUsed) {
        // Orphan file! Delete it.
        await supabaseAdmin.storage.from('products').remove([`customer-uploads/${file.name}`]);
        deletedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Checked ${checkedCount} old files. Deleted ${deletedCount} abandoned uploads.`,
      deletedCount
    }), { status: 200 });

  } catch (err: any) {
    console.error('Cleanup error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
