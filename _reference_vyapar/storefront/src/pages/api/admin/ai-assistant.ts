import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { getSettings } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

// ── Types ────────────────────────────────────────────────────────────────
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

interface AiRequest {
  page: string;
  query: string;
  pageData?: any;
  history?: ChatMessage[];
}

interface AiResponse {
  reply: string;
  action?: string;
  params?: Record<string, any>;
  confirmRequired?: boolean;
  confirmMessage?: string;
}

// ── Page-Specific System Prompts ─────────────────────────────────────────
function buildSystemPrompt(page: string, pageData: any, storeName: string, categoryContext: string): string {
  const dataStr = pageData ? JSON.stringify(pageData).slice(0, 8000) : 'not available';
  const storeCtxStr = `Store Name: ${storeName}. ${categoryContext}`;

  const pageConfigs: Record<string, string> = {
    orders: `You are the AI assistant for "${storeName}" e-commerce admin panel — Orders section.
Current orders data: ${dataStr}

Available actions you can suggest:
- filter_status: params { status: "pending"|"confirmed"|"shipped"|"delivered"|"cancelled" }
- filter_date: params { date: "YYYY-MM-DD" | date range }
- update_awb: params { order_id: string, awb: string } — fills tracking number
- update_status: params { order_id: string, status: "pending"|"confirmed"|"shipped"|"delivered"|"cancelled" } — changes individual order status
- bulk_print: no params — navigates to batch print page
- navigate: params { url: string }

Answer questions about orders using the data. Be concise, friendly, use Hinglish if user writes in Hindi. Prefer taking actions over just talking.`,

    'batch-invoice': `You are the AI assistant for the Batch Print section.
Current orders data: ${dataStr}

Available actions:
- select_by_status: params { status: string }
- select_by_date: params { date: "YYYY-MM-DD" }
- print_invoices: confirmRequired: true
- print_labels: confirmRequired: true  
- export_csv: no confirm
- clear_selection: no confirm

Answer questions and suggest actions. Hinglish OK. Prefer taking actions over just talking.`,

    products: `You are the AI assistant for the Products catalog section.
Current products data: ${dataStr}

Available actions:
- search_product: params { query: string }
- filter_category: params { category: string }
- toggle_stock: params { productSlug: string, variantId: string, inStock: boolean } — confirmRequired: true
- navigate_edit: params { productSlug: string }
- show_all: no params

Answer questions about products from the data. Hinglish OK. Prefer taking actions over just talking.`,

    reports: `You are the AI assistant for the Reports & Analytics section.
Current stats data: ${dataStr}

Available actions:
- scroll_to: params { section: "revenue"|"bestsellers"|"payments"|"orders" }
- export_csv: no confirm

Answer analytical questions using the stats data directly. Be precise with numbers. Hinglish OK. Prefer taking actions over just talking.`,

    dashboard: `You are the AI assistant for the Dashboard.
Current summary data: ${dataStr}

Available actions:
- navigate: params { url: string }

Answer questions about overall store performance. Suggest navigating to relevant sections. Hinglish OK. Prefer taking actions over just talking.`,

        'flash-sales': `You are the AI assistant for the Flash Sales section.
Current campaigns & available products: ${dataStr}

Available actions:
- create_campaign: params { name: string }
- toggle_flash_sale: params { enabled: boolean } — confirmRequired: true
- open_offer_modal: no params
- fill_flash_sale_setup: params { campaign_id, stock_type: "total"|"per_product", total_stock, fake_percentage } — opens modal AND fills fields
- add_flash_sale_offers: params { offers: [{ product: string, variant: string, salePrice: number }] } — Adds products to the bulk offer table.
  IMPORTANT MATH RULE: If user says "% sale on MRP", calculate salePrice = mrp - (mrp * percent / 100). If user says "% off", calculate salePrice = regularPrice - (regularPrice * percent / 100). ALWAYS DO THE MATH YOURSELF and return the final calculated integer 'salePrice'.

Hinglish OK. Prefer taking actions over just talking.`,


    customers: `You are the AI assistant for the Customers section.
Current customers data: ${dataStr}

Available actions:
- search_customer: params { query: string }
- export_csv: no confirm
- navigate_orders: params { customerId: string }

Answer questions about customers from data. Hinglish OK. Prefer taking actions over just talking.`,

    coupons: `You are the AI assistant for the Coupon Manager.
Current coupons data: ${dataStr}

Available actions:
- generate_coupon_code: params { description: string } — AI generates creative code
- open_add_form: no params
- fill_coupon_form: params { code, discount_type: "percentage"|"flat", discount_value, min_cart_value, expires_at, usage_limit, first_order_only: boolean, is_public: boolean } — opens modal AND fills fields

Hinglish OK. Prefer taking actions over just talking.`,

    reviews: `You are the AI assistant for the Reviews section.
Current reviews data: ${dataStr}

Available actions:
- filter_reviews: params { status: "pending"|"approved"|"rejected"|"all" }
- approve_all_pending: confirmRequired: true

Answer questions, calculate averages from data. Hinglish OK. Prefer taking actions over just talking.`,

    categories: `You are the AI assistant for Category Management.
Current categories data: ${dataStr}

Available actions:
- open_add_form: no params
- fill_category_form: params { name, slug, description } — opens modal AND fills fields

Answer questions from data. Hinglish OK. Prefer taking actions over just talking.`,

    blog: `You are the AI assistant for Blog Management.
Current posts data: ${dataStr}

Available actions:
- new_post: no params
- filter_status: params { status: "published"|"draft" }
- generate_outline: params { topic: string }

Hinglish OK. Prefer taking actions over just talking.`,
    'blog/new': `You are the AI assistant for creating a new Blog Post.
Available actions:
- fill_blog_post: params { title, excerpt, tags, seo_title, seo_description, category } — fills form fields
- generate_outline: params { topic: string }

Hinglish OK. Prefer taking actions over just talking.`,
    
    'product_edit': `You are the AI assistant for editing a product.
Available actions:
- generate_listing: params { prompt: string } — Fills the listing generator prompt and clicks generate

Hinglish OK. Prefer taking actions over just talking.`,

    shipping: `You are the AI assistant for Shipping Rates.
Current shipping config data: ${dataStr}

Available actions:
- scroll_to_zone: params { zone: string }
- open_add_zone_modal: no params

Answer questions about rates from data. Hinglish OK. Prefer taking actions over just talking.`,

    staff: `You are the AI assistant for Staff Accounts.
Current staff data: ${dataStr}

Available actions:
- search_staff: params { query: string }
- open_invite_form: params { name, email, role: "admin"|"manager"|"custom"|"viewer" } — opens modal AND fills fields

Hinglish OK. Prefer taking actions over just talking.`,

    settings: `You are the AI assistant for API Settings.
Context: This page manages API keys for Gemini, Razorpay, Supabase, Resend email service, and Shipping.

Available actions:
- scroll_to_section: params { section: "payment"|"shipping"|"ai"|"notifications"|"ads"|"homepage" }
- fill_settings: params { free_shipping_threshold, flat_shipping_rate, minimum_order_amount, allow_coupon_stacking: boolean, state_shipping_rules: string, trending_slider_enabled: boolean, trending_slider_title: string, trending_slider_products: string, admin_email, test_otp_mode_enabled: boolean } — fills fields

Guide the user on what keys to enter and where to get them. Hinglish OK. Prefer taking actions over just talking.`,

    notifications: `You are the AI assistant for Notifications.
Current notifications data: ${dataStr}

Available actions:
- filter_notifications: params { unread: boolean }
- mark_all_read: confirmRequired: true

Answer questions from data. Hinglish OK. Prefer taking actions over just talking.`,

    feedback: `You are the AI assistant for Feedback & B2B.
Current feedback data: ${dataStr}

Available actions:
- switch_tab: params { tabId: "feedback-tab"|"b2b-tab" }
- resolve_all_feedback: confirmRequired: true
- mark_all_bulk_contacted: confirmRequired: true

Hinglish OK. Prefer taking actions over just talking.`,

    seo: `You are the AI assistant for SEO Settings.
Available actions:
- fill_global_seo: params { title: string (max 60 chars), desc: string (max 160 chars), image: string } — fills fields
- scroll_to_page: params { page: string }

Help generate meta titles (max 60 chars) and descriptions (max 160 chars). Hinglish OK. Prefer taking actions over just talking.`,

    marketing: `You are the AI assistant for Marketing.
Available actions:
- fill_marketing_ids: params { meta_pixel_id, ga4_id, google_ads_conversion_id, google_ads_conversion_label } — fills fields
- open_campaign_form: no params
- generate_subject: params { campaignType: string }

Hinglish OK. Prefer taking actions over just talking.`,

    hero: `You are the AI assistant for Hero Banner.
Current slides data: ${dataStr}

Available actions:
- open_add_slide: no params
- fill_hero_slide: params { headline, headline_accent, tagline, description, button_text, button_link, secondary_button_text, secondary_button_link } — opens modal AND fills fields

Hinglish OK. Prefer taking actions over just talking.`,

    media: `You are the AI assistant for Media Library.
Available actions:
- switch_tab: params { tabId: "images"|"documents" }
- navigate: params { url: string }

Guide on best image formats, sizes, and naming. Hinglish OK. Prefer taking actions over just talking.`,

    'bulk-upload': `You are the AI assistant for Bulk Upload.
Available actions:
- switch_tab: params { tabId: string }
- navigate: params { url: string }

Guide on CSV format, required columns, how to fix errors. Hinglish OK. Prefer taking actions over just talking.`,
  };

  const base = pageConfigs[page] || `You are the AI assistant for ${storeName} admin panel. Current section: ${page}. Page data: ${dataStr}. Hinglish OK.`;

  return `${base}

CRITICAL INSTRUCTIONS:
1. ALWAYS respond with valid JSON only — no markdown, no extra text.
2. JSON format: { "reply": "...", "action": "action_key_or_null", "params": {}, "confirmRequired": false, "confirmMessage": "" }
3. "reply" should be conversational, helpful, in the same language as the user (Hindi/Hinglish/English).
4. If no action needed (just answering a question), set action to null.
5. If action needs user confirmation, set confirmRequired to true with a clear confirmMessage.
6. Be precise with data — read numbers, dates from the pageData provided.
7. For date queries in Hindi: "aaj" = today, "kal" = yesterday, understand "22 May" as date.
${storeCtxStr ? `\n8. Store context: ${storeCtxStr}` : ''}`;
}

// ── Fallback Rule-Based Responses ────────────────────────────────────────
function getFallbackResponse(page: string, query: string): AiResponse {
  const lower = query.toLowerCase();

  // Navigation patterns
  if (lower.includes('orders pe ja') || lower.includes('orders mein ja')) {
    return { reply: 'Orders section mein le ja raha hoon...', action: 'navigate', params: { url: '/admin/orders' } };
  }
  if (lower.includes('products pe ja') || lower.includes('products mein')) {
    return { reply: 'Products section mein le ja raha hoon...', action: 'navigate', params: { url: '/admin/products' } };
  }

  // Page-specific fallbacks
  if (page === 'orders') {
    if (lower.includes('pending')) return { reply: 'Pending orders filter kar raha hoon...', action: 'filter_status', params: { status: 'pending' } };
    if (lower.includes('shipped')) return { reply: 'Shipped orders filter kar raha hoon...', action: 'filter_status', params: { status: 'shipped' } };
    if (lower.includes('delivered')) return { reply: 'Delivered orders filter kar raha hoon...', action: 'filter_status', params: { status: 'delivered' } };
    if (lower.includes('cancelled')) return { reply: 'Cancelled orders filter kar raha hoon...', action: 'filter_status', params: { status: 'cancelled' } };
    if (lower.includes('print') || lower.includes('invoice')) return { reply: 'Invoice print ke liye Batch Print section mein jaayein, ya upar kebtn se directly print karein.', action: 'navigate', params: { url: '/admin/batch-invoice' } };
  }

  if (page === 'batch-invoice') {
    if (lower.includes('pending')) return { reply: 'Pending orders select kar raha hoon...', action: 'select_by_status', params: { status: 'pending' }, confirmRequired: false };
    if (lower.includes('print')) return { reply: 'Kya aap selected orders print karna chahte hain?', action: 'print_invoices', params: {}, confirmRequired: true, confirmMessage: 'Selected orders ke invoices print karein?' };
  }

  if (page === 'products') {
    const searchMatch = lower.match(/(?:search|dhoondo|find)\s+(.+)/i);
    if (searchMatch) return { reply: `"${searchMatch[1]}" search kar raha hoon...`, action: 'search_product', params: { query: searchMatch[1] } };
  }

  if (page === 'reports') {
    if (lower.includes('export') || lower.includes('csv') || lower.includes('download')) return { reply: 'CSV export kar raha hoon...', action: 'export_csv', params: {} };
    if (lower.includes('bestsell') || lower.includes('top product')) return { reply: 'Bestsellers section mein scroll kar raha hoon...', action: 'scroll_to', params: { section: 'bestsellers' } };
    if (lower.includes('revenue') || lower.includes('chart')) return { reply: 'Revenue chart pe le ja raha hoon...', action: 'scroll_to', params: { section: 'revenue' } };
  }

  return {
    reply: `Main samajh nahi paya: "${query}". Neeche diye suggestions try karein, ya Gemini API key Settings mein configure karein for full AI support.`,
    action: null,
    params: {}
  };
}

// ── Main Handler ─────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!ctx || !ctx.adminRole) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body: AiRequest = await request.json();
        const { page, query, pageData, history = [] } = body;
    
        if (!query?.trim()) {
          return new Response(JSON.stringify({ reply: 'Please type a command.', action: null }), { status: 400 });
        }
    
        // Get Gemini API key from DB settings (secure server-side)
        const settings = await getSettings();
        const apiKey = (settings?.gemini_api_key || import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    
        const storeName = settings?.store_name || 'My E-Commerce Store';
    
        if (!apiKey) {

          // Use rule-based fallback
          const fallback = getFallbackResponse(page, query);
          return new Response(JSON.stringify({ ...fallback, mode: 'smart-match' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
    
        let categoryContext = '';
        try {
          const { getCategories } = await import('../../../lib/database');
          const cats = await getCategories();
          const topCats = (cats || []).slice(0, 10).map((c: any) => c.name).join(', ');
          if (topCats) categoryContext = `Available Categories: ${topCats}`;
        } catch (e) {}
    
        // ── Gemini API Call ────────────────────────────────────────────────
        const systemPrompt = buildSystemPrompt(page, pageData, storeName, categoryContext);
    
        // Build conversation history for Gemini
        const contents: any[] = [];
        for (const msg of history.slice(-6)) { // last 6 messages for context
          contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
        }
        contents.push({ role: 'user', parts: [{ text: query }] });
    
        const modelsToTry = [
          'gemini-3.5-flash',
          'gemini-3.1-flash-lite',
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite'
        ];
    
        let geminiResp: Response | null = null;
        let lastError = '';
    
        for (const model of modelsToTry) {
          geminiResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.4,
                  maxOutputTokens: 8192,
                },
              }),
            }
          );
          if (geminiResp.ok) break;
          const errTxt = await geminiResp.text();
          console.warn(`[ai-assistant] ${model} failed:`, geminiResp.status, errTxt);
          lastError = `[${model}] ${geminiResp.status}`;
        }
    
        if (!geminiResp || !geminiResp.ok) {
          console.error('[ai-assistant] All Gemini models failed:', lastError);
          const fallback = getFallbackResponse(page, query);
          return new Response(JSON.stringify({ ...fallback, mode: 'smart-match' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
    
        const geminiData = await geminiResp.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
        let parsed: AiResponse;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          // Gemini returned non-JSON — treat as plain reply
          parsed = { reply: rawText, action: null, params: {} };
        }
    
        return new Response(JSON.stringify({ ...parsed, mode: 'gemini' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
    
      } catch (err: any) {
        console.error('[ai-assistant] Error:', err);
        return new Response(JSON.stringify({ reply: 'Server error. Please try again.', action: null }), { status: 500 });
      }
  });
};
