import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { sendNotifications } from '../../../lib/notifications';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'settings')) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to manage settings.' }), { status: 403 });
    }

    const storeId = (locals as any).storeId;
    if (!storeId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { osType } = await request.json();
    
    // We can store this state in `pages_content` table since we don't have a dedicated column
    // Fetch current pages_content for the store
    const { data: currentContent } = await supabaseAdmin
      .from('pages_content')
      .select('mobile_app_config')
      .eq('store_id', storeId)
      .single();

    let mobileAppConfig = currentContent?.mobile_app_config || {};
    
    // Update status to 'processing'
    if (osType === 'android') {
      mobileAppConfig.android_status = 'processing';
      mobileAppConfig.android_requested_at = new Date().toISOString();
    } else if (osType === 'ios') {
      mobileAppConfig.ios_status = 'processing';
      mobileAppConfig.ios_requested_at = new Date().toISOString();
    } else if (osType === 'rider') {
      mobileAppConfig.rider_status = 'processing';
      mobileAppConfig.rider_requested_at = new Date().toISOString();
    }

    // Save back to DB
    await supabaseAdmin
      .from('pages_content')
      .upsert({ 
        store_id: storeId, 
        mobile_app_config: mobileAppConfig 
      }, { onConflict: 'store_id' });

    // Send email alert to Super Admin!
    await sendNotifications({
      type: 'mobile_app_request',
      storeId: storeId,
      message: osType
    });

    return new Response(JSON.stringify({ success: true, message: 'Request sent successfully.' }), { status: 200 });
  } catch (error: any) {
    console.error('Error requesting app:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
