/**
 * Notification Service – sends alerts to Telegram, Email, and WhatsApp
 *
 * API Keys are loaded from admin settings (stored in DB).
 * Set these in Admin → Settings → Notifications:
 * - telegram_bot_token: Your Telegram Bot Token
 * - telegram_chat_id:   Your Telegram Chat ID
 * - resend_api_key:     Your Resend.com API Key
 * - admin_email:        Email address for admin notifications
 * - twilio_account_sid: Your Twilio Account SID
 * - twilio_auth_token:  Your Twilio Auth Token
 * - twilio_whatsapp_number: e.g. whatsapp:+14155238886
 */

import { getSettings, isSupabase, rawSupabaseAdmin } from './database';
import { getPlatformSettings } from './platform-settings';
import { fetchWithRetry } from './fetch-retry';
import { sendMetaEvent } from './meta-capi';
import { sendWhatsAppNotification } from './whatsapp';

interface NotificationPayload {
  type: 'new_order' | 'feedback' | 'bulk_order' | 'order_shipped' | 'abandoned_cart' | 'affiliate_application' | 'affiliate_withdrawal' | 'mobile_app_request';
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  amount?: number;
  message?: string;
  address?: any;
  items?: any[];
  paymentMethod?: string;
  trackingLink?: string;
  
  // For Affiliates
  affiliateName?: string;
  affiliateEmail?: string;
  affiliatePhone?: string;
  affiliateInsta?: string;
  upiId?: string;
  storeId?: string;
}

export async function sendNotifications(payload: NotificationPayload) {
  try {
    const settings = await getSettings(payload.storeId);
    const platformSettings = await getPlatformSettings();
    
    if (!settings) {
        throw new Error('Settings not found for storeId: ' + payload.storeId);
    }

    // ── 0. Trigger UI Notification (Bell Icon) ────────────────────────────────
    if (payload.type === 'new_order' && payload.orderId) {
      const { addNotification, supabaseAdmin } = await import('./database');
      if (supabaseAdmin) {
        // Find suborders to notify individual sellers
        const { data: subs } = await supabaseAdmin.from('marketplace_sub_orders')
          .select('order_id, store_id, amount')
          .eq('master_id', payload.orderId);
        
        if (subs && subs.length > 0) {
          for (const sub of subs) {
            const isDirect = sub.store_id === payload.storeId;
            const msg = isDirect 
              ? `New order #${sub.order_id} from ${payload.customerName || 'Guest'} — ₹${sub.amount}`
              : `New marketplace order #${sub.order_id} — ₹${sub.amount}`;
            await addNotification('order', sub.order_id, msg, sub.store_id).catch(console.error);
          }
        } else {
          const msg = `New order #${payload.orderId} from ${payload.customerName || 'Guest'} — ₹${payload.amount}`;
          await addNotification('order', payload.orderId, msg, payload.storeId).catch(console.error);
        }
      } else {
         const msg = `New order #${payload.orderId} from ${payload.customerName || 'Guest'} — ₹${payload.amount}`;
         await addNotification('order', payload.orderId, msg, payload.storeId).catch(console.error);
      }
      
      // Trigger Meta CAPI Purchase Event
      if (payload.amount) {
        await sendMetaEvent('Purchase', {
          currency: 'INR',
          value: payload.amount,
          content_ids: payload.items?.map(i => i.id || i.product_id) || [],
          content_type: 'product',
          order_id: payload.orderId
        }, {
          em: payload.customerEmail,
          ph: payload.customerPhone ? payload.customerPhone.replace(/\D/g, '') : undefined,
          fn: payload.customerName ? payload.customerName.split(' ')[0] : undefined,
          ln: payload.customerName && payload.customerName.includes(' ') ? payload.customerName.split(' ').slice(1).join(' ') : undefined,
          ct: payload.address?.city,
          st: payload.address?.state,
          zp: payload.address?.pincode,
          country: 'in'
        });
      }
    }

    const results = {
    telegram: false,
    email: false,
    whatsapp: false,
  };

  const safeCustomerName = payload.customerName ? payload.customerName.trim() : 'Customer';

  // Format message text
  let text = '';
  switch (payload.type) {
    case 'new_order':
      const orderType = payload.paymentMethod?.toLowerCase().includes('cod') ? 'COD (Cash on Delivery)' : 'Paid Online';
      text = `🛒 *New Order!*\n\nOrder: #${payload.orderId}\nCustomer: ${safeCustomerName}\nAmount: ₹${payload.amount}\nType: ${orderType}\n`;
      
      if (payload.customerPhone) {
        text += `Phone: ${payload.customerPhone}\n`;
      }
      if (payload.customerEmail) {
        text += `Email: ${payload.customerEmail}\n`;
      }
      
      if (payload.address) {
        const addrLine = payload.address.street_address || payload.address.addressLine || payload.address.address || '';
        text += `\n📍 *Address:*\n${addrLine}, ${payload.address.city}, ${payload.address.state} - ${payload.address.pincode}\n`;
      }
      
      if (payload.items && payload.items.length > 0) {
        text += `\n📦 *Products:*\n`;
        payload.items.forEach(item => {
          const variantStr = item.variant || item.weight || item.size || '';
          const displayVariant = variantStr ? ` (${variantStr})` : '';
          text += `- ${item.name}${displayVariant} x ${item.quantity || item.qty || 1}\n`;
        });
      }
      
      text += `\nCheck admin panel for details.`;
      break;
    case 'feedback':
      text = `📩 *New Feedback*\n\n${payload.message}\n\nFrom: ${safeCustomerName}`;
      break;
    case 'bulk_order':
      const safeMsg = (payload.message || '').replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&');
      text = `📦 *Bulk Order Inquiry*\n\n${safeMsg}\n\nFrom: ${safeCustomerName}`;
      break;
    case 'affiliate_application':
      text = `🤝 *New Affiliate Application!*\n\nName: ${payload.affiliateName}\nPhone: ${payload.affiliatePhone}\nEmail: ${payload.affiliateEmail}\nInsta: ${payload.affiliateInsta || 'N/A'}\n\nPlease review and approve from the Admin Panel.`;
      break;
    case 'affiliate_withdrawal':
      text = `💰 *Affiliate Withdrawal Request!*\n\nName: ${payload.affiliateName}\nAmount: ₹${payload.amount}\nUPI/Bank: ${payload.upiId || 'Check profile'}\n\nPlease process this payout from the Admin Panel.`;
      break;
    case 'mobile_app_request':
      text = `📱 *Native App Request!*\n\nStore ID: ${payload.storeId}\nOS: ${payload.message}\n\nA merchant has requested a native app build.`;
      break;
  }

  // ── 1. Telegram ───────────────────────────────────────────────────────────
  const telegramToken = settings.telegram_bot_token;
  const telegramChatIdString = settings.telegram_chat_id;

  if (telegramToken && telegramChatIdString) {
    try {
      // Allow multiple chat IDs separated by comma
      const chatIds = telegramChatIdString.split(',').map((id: string) => id.trim()).filter((id: string) => id);
      
      const sendPromises = chatIds.map((chatId: string) => 
        fetchWithRetry(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
          }),
        })
      );
      
      const responses = await Promise.all(sendPromises);
      results.telegram = responses.every((res) => res.ok);
    } catch (err) {
      console.error('[Telegram] Failed to send:', err);
    }
  } else {
    console.log('[Telegram] Skipped – no bot token or chat ID configured.');
  }

  // ── 2. Email via Resend ───────────────────────────────────────────────────
  const fallbackKey = process.env.RESEND_API_KEY || platformSettings.resend_api_key;
  const resendKey = settings.resend_api_key || fallbackKey;
  const isPlatformFallback = !settings.resend_api_key && !!platformSettings.resend_api_key;
  // Route app requests to platform owner
  let adminEmail = settings.admin_email;
  if (payload.type === 'mobile_app_request') {
    adminEmail = platformSettings.support_email || process.env.ADMIN_EMAIL || settings.admin_email;
  }

  if (resendKey && adminEmail) {
    try {
      const subject =
        payload.type === 'new_order'
          ? `New Order #${payload.orderId} – ₹${payload.amount}`
          : payload.type === 'feedback'
          ? `New Feedback from ${payload.customerName}`
          : payload.type === 'affiliate_application'
          ? `New Affiliate Application - ${payload.affiliateName}`
          : payload.type === 'affiliate_withdrawal'
          ? `Payout Request - ${payload.affiliateName} (₹${payload.amount})`
          : payload.type === 'mobile_app_request'
          ? `Native App Request from Store: ${payload.storeId}`
          : `Bulk Order Inquiry from ${payload.customerName}`;

      // Dynamically determine verified domain
      let tenantDomain = settings?.store_domain || process.env.PUBLIC_DOMAIN || 'vyaparpe.in';
      
      if (settings?.contact_email && settings.contact_email.includes('@')) {
        const domain = settings.contact_email.split('@')[1].toLowerCase();
        const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com'];
        if (!publicDomains.includes(domain)) {
          tenantDomain = domain;
        }
      }

      const fromEmail = isPlatformFallback
        ? `${settings.store_name || 'Store Name'} <noreply@auth.vyaparpe.in>`
        : `${settings.store_name || 'Store Name'} <noreply@auth.${tenantDomain}>`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [adminEmail.trim()],
          subject: subject,
          text: text.replace(/\*/g, ''),
          reply_to: settings.contact_email || undefined
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Resend Email] API Error:', res.status, errorText);
        
        // Log to routing_code for debugging
        if (rawSupabaseAdmin && payload.orderId) {
            await rawSupabaseAdmin.from('orders').update({ routing_code: `Error: ${res.status} - ${errorText}` }).eq('order_id', payload.orderId).eq('store_id', payload.storeId).then();
        }
      } else {
        // Log success
        if (rawSupabaseAdmin && payload.orderId) {
            await rawSupabaseAdmin.from('orders').update({ routing_code: `Success: Email Sent to Resend` }).eq('order_id', payload.orderId).eq('store_id', payload.storeId).then();
        }
      }
      results.email = res.ok;
    } catch (err) {
      console.error('[Resend Email] Failed to send:', err);
    }
  } else {
    console.log('[Resend Email] Skipped – no API key or admin email configured.');
    if (rawSupabaseAdmin && payload.orderId) {
       await rawSupabaseAdmin.from('orders').update({ routing_code: `Skipped: Missing API key or admin_email` }).eq('order_id', payload.orderId).eq('store_id', payload.storeId).then();
    }
  }

  // ── 3. WhatsApp Integration ────────────────────────────────────────────────
  const isWaEnabled = String(settings.whatsapp_enabled) === 'true';
  const waProvider = settings.whatsapp_api_provider || 'interakt';
  const waApiKey = settings.whatsapp_api_key;
  const waFrom = settings.whatsapp_from_number;
  
  let rawPhone = payload.customerPhone ? payload.customerPhone.replace(/\D/g, '').slice(-10) : null;

  let waText = '';
  let shouldSendWa = false;
  let activeTemplate = '';
  let templateVars: string[] = [];

  if (isWaEnabled) {
    if (payload.type === 'affiliate_application' || payload.type === 'affiliate_withdrawal') {
      const adminPhone = settings.whatsapp_admin_number;
      if (adminPhone) {
        rawPhone = adminPhone.replace(/\D/g, '').slice(-10);
        waText = text; // Reuse the Telegram text block
        shouldSendWa = true;
      }
    } else if (rawPhone && payload.type === 'bulk_order') {
      waText = `Hi ${safeCustomerName}! 📦\n\nThank you for your bulk order inquiry. Our team has received your requirements and will contact you shortly!\n\n– ${settings.store_name || 'Your Store'}`;
      shouldSendWa = true;
    } else if (rawPhone && payload.type === 'new_order' && String(settings.whatsapp_notify_order_placed) === 'true') {
      waText = `Hi ${safeCustomerName}! 🎉\n\nThank you for your order (#${payload.orderId}) worth ₹${payload.amount}.\n\nWe'll notify you once it ships!\n\n– ${settings.store_name || 'Your Store'}`;
      activeTemplate = settings.whatsapp_template_order_placed;
      templateVars = [payload.customerName || 'Customer', payload.orderId || '', payload.amount?.toString() || '0'];
      shouldSendWa = true;
    } else if (payload.type === 'order_shipped' && String(settings.whatsapp_notify_order_shipped) === 'true') {
      waText = `Hi ${safeCustomerName}! 🚚\n\nGreat news! Your order (#${payload.orderId}) has been shipped.${payload.trackingLink ? `\n\nTrack your package here: ${payload.trackingLink}` : ''}\n\n– ${settings.store_name || 'Your Store'}`;
      activeTemplate = settings.whatsapp_template_order_shipped;
      templateVars = [payload.customerName || 'Customer', payload.orderId || '', payload.trackingLink || ''];
      shouldSendWa = true;
    } else if (payload.type === 'abandoned_cart' && String(settings.whatsapp_notify_abandoned_cart) === 'true') {
      const checkoutUrl = `https://${settings.store_domain || process.env.PUBLIC_DOMAIN || 'vyaparpe.in'}/checkout`;
      waText = `🛒 *You left something behind!*\n\nHi ${safeCustomerName}, we noticed you left some premium dry fruits in your cart.\n\nComplete your purchase now: ${payload.message || checkoutUrl}`;
      activeTemplate = settings.whatsapp_template_abandoned_cart;
      templateVars = [payload.customerName || 'Customer', payload.message || checkoutUrl];
      shouldSendWa = true;
    }
  }

  // Legacy fallback if new settings aren't enabled but old Twilio is present for new_order
  if (!isWaEnabled && rawPhone && payload.type === 'new_order' && settings.twilio_account_sid && settings.twilio_auth_token) {
     waText = `Hi ${safeCustomerName}! 🎉\n\nThank you for your order (#${payload.orderId}) worth ₹${payload.amount}.\n\nWe'll notify you once it ships!\n\n– ${settings.store_name || 'Your Store'}`;
     shouldSendWa = true;
  }
  
  // Try Official WhatsApp Cloud API first
  if (settings.whatsapp_api_token && settings.whatsapp_phone_number_id && payload.type === 'new_order' && rawPhone) {
    try {
      // Assuming 'new_order_template' is the approved template name
      await sendWhatsAppNotification(rawPhone, 'new_order_template', 'en');
      results.whatsapp = true;
      shouldSendWa = false; // Prevent fallback execution
    } catch (e) {
      console.error('[WhatsApp Cloud API] Failed', e);
    }
  }

  if (shouldSendWa && waText) {
    try {
      if (waProvider === 'interakt' && waApiKey) {
        // Interakt Public Message API (Session messaging or approved full-text templates if configured)
        let requestBody: any;
        if (activeTemplate) {
          requestBody = {
            countryCode: '+91', // Defaulting to India
            phoneNumber: rawPhone,
            type: 'Template',
            template: {
              name: activeTemplate,
              languageCode: 'en',
              bodyValues: templateVars
            }
          };
        } else {
          requestBody = {
            countryCode: '+91', // Defaulting to India
            phoneNumber: rawPhone,
            type: 'Chat',
            message: { type: 'text', text: waText }
          };
        }

        const res = await fetchWithRetry('https://api.interakt.ai/v1/public/message/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${waApiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
        results.whatsapp = res.ok;
        if (!res.ok) console.error('[WhatsApp Interakt] Error:', await res.text());
      } 
      else if (waProvider === 'wati' && waApiKey) {
        // WATI usually requires a custom endpoint URL. We assume standard v1 text message format.
        console.warn('[WhatsApp WATI] Ensure your endpoint URL is correctly configured. WATI integration requires specific endpoint bindings.');
      }
      else if (waProvider === 'twilio' || (!isWaEnabled && settings.twilio_account_sid)) {
        const twilioSid = settings.twilio_account_sid; // From old settings
        const twilioAuth = waApiKey || settings.twilio_auth_token;
        const fromNumber = waFrom || settings.twilio_whatsapp_number || settings.twilio_phone_number;
        
        if (twilioSid && twilioAuth && fromNumber) {
          const auth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
          const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
          const formattedTo = `whatsapp:+91${rawPhone}`;

          const params = new URLSearchParams();
          params.append('To', formattedTo);
          params.append('From', formattedFrom);
          params.append('Body', waText);

          const res = await fetchWithRetry(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${auth}`,
            },
            body: params,
          });
          results.whatsapp = res.ok;
          if (!res.ok) console.error('[WhatsApp Twilio] Error:', await res.text());
        }
      }
    } catch (err) {
      console.error(`[WhatsApp API - ${waProvider}] Failed to send:`, err);
    }
  }

  return results;
  } catch (globalErr: any) {
    console.error('[sendNotifications] Global Exception:', globalErr);
    if (rawSupabaseAdmin && payload.orderId) {
        await rawSupabaseAdmin.from('orders').update({ routing_code: `CRASH: ${globalErr.message}` }).eq('order_id', payload.orderId).eq('store_id', payload.storeId).then();
    }
    return { email: false, telegram: false, whatsapp: false };
  }
}
