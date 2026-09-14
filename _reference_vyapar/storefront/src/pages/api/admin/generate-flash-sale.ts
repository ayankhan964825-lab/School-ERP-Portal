import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { getSettings } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'marketing')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const { prompt, catalogContext, currentData } = await request.json();
        if (!prompt) return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });

        // Security: Sanitize prompt to prevent prompt injection attacks
        const sanitizedPrompt = prompt
          .replace(/ignore\s+(previous\s+)?instructions?/gi, '')
          .replace(/system\s+prompt:/gi, '')
          .replace(/\[INST\]/gi, '')
          .replace(/<\/?s>/gi, '')
          .trim()
          .slice(0, 500); // Hard limit on prompt length
    
        const settings = await getSettings();
        const apiKey = (settings?.gemini_api_key || import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    
        const storeName = settings?.store_name || 'My E-Commerce Store';
        const brandName = settings?.brand_name || storeName;

    
        // ── REAL GEMINI AI ────────────────────────────────────────────────
        if (apiKey) {
          try {
            const systemPrompt = `You are a promotional marketing expert for "${storeName}" (Brand: ${brandName}).
    ${currentData && currentData.campaigns && currentData.campaigns.length > 0 
      ? `You are updating an EXISTING flash sale. CURRENT FLASH SALE JSON:\n${JSON.stringify(currentData, null, 2)}\n\nApply the user's requested changes to this JSON (e.g. adding products, changing dates, updating discounts) and return the full updated JSON.`
      : `Generate a valid JSON object representing a bulk flash sale configuration based on the user's prompt.`}
    The user prompt may ask for specific dates, discounts, or target specific products.
    
    Use the provided Active Product Catalog to find valid product names and understand their current MRP and Regular Prices. If the user specifies "on MRP", set "discount_basis" to "mrp", otherwise use "regular_price".
    
    Active Product Catalog:
    ${catalogContext || 'No products available.'}
    
    Your output MUST be a valid JSON object with the exact structure below (no markdown formatting, no explanations, just the JSON):
    {
      "campaigns": [
        {
          "title": "Sale Name",
          "discount_percentage": 15,
          "discount_basis": "regular_price",
          "startDate": "YYYY-MM-DDTHH:mm",
          "endDate": "YYYY-MM-DDTHH:mm",
          "product_names": ["Product 1", "Product 2"]
        }
      ]
    }
    
    Ensure product_names exactly match the provided catalog. Start and end dates must be in ISO format without seconds (e.g., "2026-06-01T10:00").`;
    
            const fetchPayload = {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser request: ${sanitizedPrompt}` }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
              }),
            };
    
            const modelsToTry = [
              'gemini-3.5-flash',
              'gemini-3.1-flash-lite',
              'gemini-2.5-flash',
              'gemini-2.5-flash-lite'
            ];
    
            let response: Response | null = null;
            let lastError = '';
    
            for (const model of modelsToTry) {
              response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                fetchPayload
              );
              
              if (response.ok) {
                break;
              } else {
                const errTxt = await response.text();
                console.warn(`[AI Flash Sale] ${model} failed:`, response.status, errTxt);
                lastError = `[${model}] ${response.status}: ${errTxt}`;
              }
            }
    
            if (!response || !response.ok) {
              throw new Error(`All Gemini models failed. Last error: ${lastError}`);
            }
            
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonStr = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
            const data = JSON.parse(jsonStr);

            // Security: Validate AI output to prevent injection-crafted abuse
            if (data.campaigns && Array.isArray(data.campaigns)) {
              data.campaigns = data.campaigns
                .filter((c: any) => 
                  typeof c.discount_percentage === 'number' &&
                  c.discount_percentage >= 1 &&
                  c.discount_percentage <= 90 // Never allow 100% off via AI
                )
                .map((c: any) => ({
                  ...c,
                  title: String(c.title || 'Flash Sale').slice(0, 100),
                  product_names: Array.isArray(c.product_names) 
                    ? c.product_names.slice(0, 50).map((n: any) => String(n).slice(0, 200))
                    : [],
                }));
            }
            return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } catch (apiError) {
            console.warn('Gemini API failed:', apiError);
          }
        }
        // ── FALLBACK MOCK (when no API key or API fails) ──────────────
        // We try to extract a discount number from the prompt
        let discount = 10;
        const match = prompt.match(/(\d+)%/);
        if (match) discount = parseInt(match[1], 10);
        
        // We try to extract product names from the catalogContext if possible
        let productNames: string[] = [];
        if (catalogContext) {
            // Extract names based on the `- Name: ` format
            const nameMatches = catalogContext.match(/- Name: (.*)/g) || [];
            productNames = nameMatches.map(m => m.replace('- Name: ', '').trim()).slice(0, 3);
        }
    
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatTime = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
        const mockData = {
          campaigns: [
            {
              title: "Generated Flash Sale",
              discount_percentage: discount,
              discount_basis: "regular_price",
              startDate: formatTime(now),
              endDate: formatTime(nextWeek),
              product_names: productNames
            }
          ]
        };
    
        return new Response(JSON.stringify(mockData), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
      } catch (error: any) {
        console.error('generate-flash-sale error:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate flash sale', details: String(error) }), { status: 500 });
      }
  });
};
