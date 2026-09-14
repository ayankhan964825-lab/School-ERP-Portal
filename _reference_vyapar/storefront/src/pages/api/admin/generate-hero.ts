import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { getSettings } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import { z } from 'zod';

const HeroSchema = z.object({
  badge: z.string().default(''),
  headline: z.string().default(''),
  accent: z.string().default(''),
  subtext: z.string().default(''),
  btnText: z.string().default('Shop Now'),
  btnLink: z.string().default('/products')
});

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'hero') && !canManageSection(ctx, 'store_front')) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      }
    try {
        const { prompt, currentData } = await request.json();
        if (!prompt) return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    
        const settings = await getSettings();
        const apiKey = (settings?.gemini_api_key || import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    
        // Context Extraction
        const storeName = settings?.store_name || 'My E-Commerce Store';
        const brandName = settings?.brand_name || storeName;

    
        // ── REAL GEMINI AI ────────────────────────────────────────────────
        if (apiKey) {
          try {
            const systemPrompt = `You are an expert e-commerce marketing copywriter for "${storeName}" (Brand: ${brandName}).
    
    ${currentData && Object.keys(currentData).length > 0 && Object.values(currentData).some(v => v !== '')
      ? `You are updating an EXISTING hero banner. CURRENT BANNER JSON:\n${JSON.stringify(currentData, null, 2)}\n\nApply the user's requested changes to this JSON and return the full updated JSON.`
      : `Generate highly engaging, conversion-optimized copy for a Hero Banner (the main slider on the homepage) based on the user's prompt.`}
    
    Return ONLY valid JSON with this exact structure (no markdown, no explanation):
    {
      "badge": "Short 2-3 word tag (e.g. 'Summer Sale', 'New Arrival')",
      "headline": "Catchy main headline (e.g. 'Fresh Forest')",
      "accent": "Accent word or phrase for the headline (e.g. 'Raw Honey.')",
      "subtext": "1-2 lines of compelling description motivating the user to buy or explore (max 120 chars)",
      "btnText": "Primary call to action (e.g. 'Shop Now', 'Explore Collection')",
      "btnLink": "Relative URL for primary button (e.g. '/products?category=honey', '/products', '/about')"
    }`;
    
            const fetchPayload = {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                  responseMimeType: 'application/json',
                  temperature: 0.7, 
                  maxOutputTokens: 8192 
                },
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
                break; // Success
              } else {
                const errTxt = await response.text();
                console.warn(`[AI Hero Banner] ${model} failed:`, response.status, errTxt);
                lastError = `[${model}] ${response.status}: ${errTxt}`;
              }
            }
    
            if (!response || !response.ok) {
              throw new Error(`All Gemini models failed. Last error: ${lastError}`);
            }
            
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            // Strip markdown code fences if present
            const jsonStr = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
            let parsedData;
            try {
              parsedData = JSON.parse(jsonStr);
            } catch (e) {
              parsedData = {};
            }
            const data = HeroSchema.parse(parsedData);
            return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } catch (apiError: any) {
            console.warn('Gemini API failed:', apiError);
            
            // ── FALLBACK MOCK WITH DEBUG INFO ─────────
            const mockData = {
              badge: 'AI Error',
              headline: 'Check API Logs',
              accent: 'Debug Mode.',
              subtext: `Failed to connect to Gemini: ${apiError.message}. Prompt: "${prompt.substring(0, 30)}..."`,
              btnText: 'View Error',
              btnLink: '#'
            };
            return new Response(JSON.stringify(mockData), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        }
    
        // ── FALLBACK MOCK (when no API key at all) ─────────
        const mockData = {
          badge: 'No API Key',
          headline: 'Settings Missing',
          accent: 'Action Required.',
          subtext: `Gemini API Key is not configured for this store. Please add it in API Settings.`,
          btnText: 'Go to Settings',
          btnLink: '/admin/settings'
        };
    
        return new Response(JSON.stringify(mockData), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
      } catch (error: any) {
        console.error('generate-hero error:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate banner', details: String(error) }), { status: 500 });
      }
  });
};
