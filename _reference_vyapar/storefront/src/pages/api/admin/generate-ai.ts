import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { getSettings } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import { z } from 'zod';

const SeoSchema = z.object({
  title: z.string().default('Untitled'),
  desc: z.string().default('')
});

const CouponSchema = z.object({
  code: z.string().default('OFFER20')
});

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'products')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const { prompt, type, context } = await request.json();
        if (!prompt) return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    
        const settings = await getSettings();
        const apiKey = (settings?.gemini_api_key || import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'Gemini API key is not configured.' }), { status: 500 });
        }
    
        const storeName = settings?.store_name || 'My E-Commerce Store';
        const brandName = settings?.brand_name || storeName;
        const aboutText = settings?.pages_content?.about_hero_text || '';
    
        let categoryContext = '';
        try {
          const { getCategories } = await import('../../../lib/database');
          const cats = await getCategories();
          const topCats = (cats || []).slice(0, 10).map((c: any) => c.name).join(', ');
          if (topCats) categoryContext = `Available Categories: ${topCats}`;
        } catch (e) {
          console.warn("Failed to fetch categories for AI context", e);
        }
    
        let systemPrompt = `You are an expert AI assistant for "${storeName}" (Brand: ${brandName}).
    ${aboutText ? `Store Description: ${aboutText}` : `You are an assistant for an e-commerce platform.`}
    ${categoryContext}\n`;
    
        if (type === 'seo') {
          systemPrompt += `Your task is to generate SEO metadata (title and description) for a specific webpage.
    Return ONLY valid JSON with this exact structure (no markdown, no explanation):
    {
      "title": "Page Title | ${storeName} (Max 60 chars)",
      "desc": "Compelling meta description optimized for search engines (Max 160 chars)"
    }`;
        } else if (type === 'coupon') {
          systemPrompt += `Your task is to generate a creative, catchy, and relevant coupon code for a promotion or campaign.
    The code should be ALL CAPS, max 12 characters, and not contain spaces.
    Return ONLY valid JSON with this exact structure:
    {
      "code": "COUPONCODE"
    }`;
        } else {
          systemPrompt += `Return the response based on the user's request in plain text.`;
        }
    
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
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: `Context/Details: ${context || ''}\nUser request: ${prompt}` }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
              }),
            }
          );
          if (response.ok) break;
          const errTxt = await response.text();
          console.warn(`[generate-ai] ${model} failed:`, response.status, errTxt);
          lastError = `[${model}] ${response.status}`;
        }
    
        if (!response || !response.ok) throw new Error(`Gemini API error. Last error: ${lastError}`);
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Attempt to parse JSON if the type expects JSON
        if (type === 'seo' || type === 'coupon') {
          const jsonStr = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
          let parsedData = {};
          try {
            parsedData = JSON.parse(jsonStr);
          } catch (e) {
            console.warn('generate-ai JSON parse failed', e);
          }
          
          const data = type === 'seo' ? SeoSchema.parse(parsedData) : CouponSchema.parse(parsedData);
          return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
    
        return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
      } catch (error: any) {
        console.error('generate-ai error:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate AI content', details: String(error) }), { status: 500 });
      }
  });
};
