import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { TABLES } from '../../../lib/constants';
import { getPlatformSettings } from '../../../lib/platform-settings';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { businessName, revenue, message, email, phone, plan_id } = body;

    if (!businessName) {
      return new Response(JSON.stringify({ success: false, error: "Business name is required" }), { status: 400 });
    }

    if (supabaseAdmin) {
      await supabaseAdmin.from(TABLES.STORE_SERVICE_REQUESTS).insert({
        store_id: 'SUPER_ADMIN_BYPASS', // Platform level lead
        request_type: 'Enterprise Plan Request',
        description: `Plan ID: ${plan_id}\nRevenue: ${revenue}\nMessage: ${message}\nContact: ${email || phone}`,
        status: 'pending'
      });
    }

    // Send email notification to Super Admin
    const settings = await getPlatformSettings();
    const resendKey = settings.resend_api_key || process.env.RESEND_API_KEY;
    const supportEmail = settings.support_email || 'faisal.khan1192519@gmail.com';

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'VyaparPe Leads <onboarding@resend.dev>',
          to: supportEmail,
          subject: `New Enterprise Request from ${businessName}`,
          html: `
            <h2>New Enterprise Plan Request</h2>
            <p><strong>Business Name:</strong> ${businessName}</p>
            <p><strong>Plan ID:</strong> ${plan_id}</p>
            <p><strong>Revenue:</strong> ${revenue}</p>
            <p><strong>Contact:</strong> ${email || phone}</p>
            <p><strong>Message:</strong><br/>${message}</p>
          `
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Lead submission error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to submit request' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
