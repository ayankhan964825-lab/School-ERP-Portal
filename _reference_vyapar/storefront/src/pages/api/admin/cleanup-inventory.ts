import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';

export const POST: APIRoute = async ({ request }) => {
    try {
        // Secure it with a simple cron secret or rely on edge functions in production
        const authHeader = request.headers.get('Authorization');
        const expectedSecret = process.env.CRON_SECRET || 'vyaparpe-local-dev-secret';
        
        if (authHeader !== `Bearer ${expectedSecret}`) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!supabaseAdmin) {
            return new Response(JSON.stringify({ error: 'Database connection failed' }), { status: 500 });
        }

        // Call the cleanup RPC (cleans abandoned checkouts older than 15 mins)
        const { data, error } = await supabaseAdmin.rpc('atomic_cleanup_abandoned_payments', {
            p_timeout_minutes: 15
        });

        if (error) {
            throw error;
        }

        return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    } catch (error: any) {
        console.error('Inventory cleanup error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
