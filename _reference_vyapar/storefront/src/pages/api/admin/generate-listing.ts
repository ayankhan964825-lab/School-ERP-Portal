import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { getSettings } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import { z } from 'zod';

const ListingSchema = z.object({
  name: z.string().default('Untitled Product'),
  category: z.string().default('Uncategorized'),
  description: z.string().default('No description provided.'),
  long_description: z.string().default(''),
  hsn_code: z.string().default('0000'),
  gst_rate: z.number().default(0),
  bullet_points: z.array(z.string()).default([]),
  badges: z.array(z.string()).default([]),
  specifications: z.record(z.string(), z.string()).default({}),
  vendor: z.string().default(''),
  tags: z.array(z.string()).default([]),
  seo_title: z.string().default(''),
  seo_description: z.string().default(''),
  variant_options: z.array(z.object({
    name: z.string(),
    values: z.array(z.string())
  })).default([]),
  variants: z.array(z.object({
    weight: z.string(),
    price: z.number(),
    mrp: z.number()
  })).default([]),
  is_digital: z.boolean().default(false),
  digital_delivery_url: z.string().nullable().default(null),
  is_q_commerce_only: z.boolean().default(false)
});

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'products')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const { prompt, currentData } = await request.json();
        if (!prompt) return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    
        const settings = await getSettings();
        const apiKey = (settings?.gemini_api_key || import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    
        // Context Extraction
        const storeName = settings?.store_name || 'My E-Commerce Store';
        const brandName = settings?.brand_name || storeName;
        const aboutText = settings?.pages_content?.about_hero_text || '';
        const isNutridry = storeName.toLowerCase().includes('nutridry');
    
        // Fetch and format categories (max 10) to guide the AI
        let categoryContext = '';
        try {
          const { getCategories } = await import('../../../lib/database');
          const cats = await getCategories();
          const topCats = (cats || []).slice(0, 10).map((c: any) => c.name).join(', ');
          if (topCats) categoryContext = `Available Store Categories: ${topCats}`;
        } catch (e) {
          console.warn("Failed to fetch categories for AI context", e);
        }
    
        // ── REAL GEMINI AI ────────────────────────────────────────────────
        if (apiKey) {
          try {
            let systemPrompt = `You are an expert product listing copywriter for "${storeName}" (Brand: ${brandName}).
    ${aboutText ? `Store Description: ${aboutText}` : `Determine the store's niche based on the user's prompt.`}
    ${categoryContext}
    
    ${currentData && Object.keys(currentData).length > 0 
      ? `You are updating an EXISTING product based on the user's prompt. \nCURRENT PRODUCT JSON:\n${JSON.stringify(currentData, null, 2)}\n\nApply the user's requested changes to this JSON and return the full updated JSON.`
      : `Generate a complete, SEO-optimized product listing based on the user's prompt. Analyze the requested product and determine the appropriate specifications to generate (e.g. for clothes use 'Material' and 'Fit', for electronics use 'Power' and 'Warranty', etc. strictly use predictable, standard keys).`}
    
    Return ONLY valid JSON with this exact structure (no markdown, no explanation):
    {
      "name": "Product Name",
      "category": "Pick the most relevant category from Available Store Categories, or invent a broad one if none match",
      "description": "Short 1-2 line description for product cards (max 150 chars)",
      "long_description": "Detailed 3-4 paragraph description for product page. Highlight features and benefits.",
      "hsn_code": "0000", // Accurately predict the 4 to 8 digit Indian HSN code for this product
      "gst_rate": 18, // Accurately predict the Indian GST rate percentage (e.g., 0, 5, 12, 18) for this product
      "bullet_points": ["Point 1: Bold Label: explanation.", "Point 2: ...", "Point 3: ...", "Point 4: ...", "Point 5: ..."],
      "badges": ["Premium", "Best Seller"],
      "specifications": {
        "Brand Name": "${brandName}",
        "_section_Health Benefits": "<p>Rich HTML content describing health benefits...</p><ul><li>Point 1</li></ul>",
        "_section_How to Use": "<p>Rich HTML content describing usage...</p>",
        "_seo_keywords": "comma, separated, seo keywords",
        // ... ADD AT LEAST 5 MORE DYNAMIC SPECIFICATIONS RELEVANT TO THE PRODUCT HERE
        // Note: For rich HTML accordion sections (e.g. Size Guide, Materials, Ingredients), prefix the key with "_section_" and output valid HTML as the value.
      },
      "vendor": "Best fitting Brand/Vendor name",
      "tags": ["tag1", "tag2", "tag3"],
      "seo_title": "SEO Optimized Product Title (max 60 chars)",
      "seo_description": "SEO Optimized Meta Description (max 150 chars)",
      "variant_options": [
        { "name": "Size", "values": ["Small", "Large"] },
        { "name": "Color", "values": ["Red", "Blue"] }
      ],
      "variants": [
        { "weight": "Small / Red", "price": 1000, "mrp": 1200 },
        { "weight": "Small / Blue", "price": 1000, "mrp": 1200 },
        { "weight": "Large / Red", "price": 1200, "mrp": 1500 },
        { "weight": "Large / Blue", "price": 1200, "mrp": 1500 }
      ],
      "is_digital": false, // Set to true ONLY if the requested product is a digital download (e-book, software, course)
      "digital_delivery_url": null, // If is_digital is true, provide a mock secure download URL here (e.g., "https://example.com/download/123")
      "is_q_commerce_only": false // Set to true ONLY if the product is fresh produce, groceries, frozen food, or requires hyperlocal fast delivery (10-30 mins). CRITICAL: If is_digital is true, is_q_commerce_only MUST be false.
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
                break; // Success, stop trying other models
              } else {
                const errTxt = await response.text();
                console.warn(`[AI Listing] ${model} failed:`, response.status, errTxt);
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
            let parsedData = {};
            try {
              parsedData = JSON.parse(jsonStr);
            } catch (e) {
              console.warn('generate-listing JSON parse failed', e);
            }
            const data = ListingSchema.parse(parsedData);
            return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } catch (apiError: any) {
            console.warn('Gemini API failed:', apiError);
            // Fallback to error mock
            return new Response(JSON.stringify({
              name: 'AI Error',
              category: 'Error',
              description: 'Failed to connect to Gemini API',
              long_description: `Error details: ${apiError.message}. All Gemini models failed or returned invalid JSON.`,
              bullet_points: ['Check API Key', 'Check Model Availability', `Prompt: ${prompt}`],
              badges: ['Error'],
              hsn_code: '0000',
              gst_rate: 0,
              specifications: { 'Error Type': 'API Connection' },
              variants: [{ weight: 'Error', price: 0, mrp: 0 }]
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        }
    
        // ── FALLBACK MOCK (when no API key) ─────────
        let mockName = 'No API Key Configured';
        const nameMatch = prompt.match(/for\s+(.*?)(?:\.|,|$)/i);
        if (nameMatch?.[1]) mockName = nameMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase());
    
        // Try to extract variants from prompt e.g. "100g (₹200), 200g (₹380)"
        const variantMatches = [...prompt.matchAll(/(\d+g)\s*[(-@]?\s*[₹Rs]?\s*(\d+)/gi)];
    
        const mockData = {
          name: mockName,
          category: 'superfoods',
          description: `Premium 100% natural ${mockName} — boost your daily nutrition effortlessly. Retains 98% of vitamins and enzymes.`,
          long_description: `Experience the true essence of nature with Store Name's ${mockName}. Sourced from the finest, ethically-managed farms across India, our raw ingredients are harvested at peak ripeness. Using our advanced low-temperature dehydration technology, we gently remove moisture while locking in the vibrant color, robust aroma, and maximum nutritional value.\n\nWhether you're a professional chef looking for consistent flavor or a health-conscious home cook wanting to elevate everyday meals, this pure powder is your perfect kitchen companion. It blends seamlessly into recipes, saving you prep time without compromising on quality or taste. Zero preservatives, zero artificial colors, zero additives.`,
          bullet_points: [
            '100% Pure & Natural: Made from single-ingredient premium produce with absolutely no additives.',
            'Nutrient Dense: Low-temperature drying preserves up to 98% of original vitamins, minerals, and enzymes.',
            'Time-Saving Convenience: Skip the washing, peeling, and chopping. Get instant flavor and nutrition.',
            'Long Shelf Life: Carefully packed in airtight, food-grade containers to maintain freshness for up to 12 months.',
            'Versatile Culinary Use: Perfect for baking, smoothies, curries, marinades, or as a natural food coloring.',
          ],
          badges: ['100% Natural', 'Premium Quality', 'Best Seller'],
          hsn_code: '0813',
          gst_rate: 5,
          specifications: {
            'Brand Name': 'Store Name',
            'Form': 'Fine Powder',
            'Country Of Origin': 'India',
            'Diet Type': 'Vegetarian, Vegan',
            'Preservatives': 'None (0%)',
            'Shelf Life': '12 Months from packaging',
            'Storage Instructions': 'Store in a cool, dry place away from direct sunlight. Keep tightly sealed.',
            'Primary Usage': 'Smoothies, Baking, Desserts, Health Drinks',
            'Flavor Profile': 'Natural, Earthy, Mildly Sweet',
          },
          variants: variantMatches.length > 0 
            ? variantMatches.map(m => ({ weight: m[1], price: parseInt(m[2]), mrp: Math.round(parseInt(m[2]) * 1.25) }))
            : [ { weight: '100g', price: 150, mrp: 200 }, { weight: '200g', price: 280, mrp: 350 } ]
        };
    
        return new Response(JSON.stringify(mockData), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
      } catch (error: any) {
        console.error('generate-listing error:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate listing', details: String(error) }), { status: 500 });
      }
  });
};
