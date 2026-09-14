import type { APIRoute } from 'astro';
import { supabaseAdmin, clearCached, getSettings } from '../../../lib/database';
import { TABLES } from '../../../lib/constants';
import crypto from 'node:crypto';

export const GET: APIRoute = async ({ locals }) => {
  if (!supabaseAdmin) {
    return new Response('Supabase not configured', { status: 500 });
  }

  try {
    const storeId = locals.storeId;
    if (!storeId) return new Response('Unauthorized', { status: 401 });
    
    const settings = await getSettings();
    const brandName = settings?.brand_name || 'Our Brand';
    
    const productId = crypto.randomUUID();
    const variantId = crypto.randomUUID();

    const productData: any = {
      id: productId,
      store_id: storeId,
      name: "Authentic Indian Tadka Combo",
      slug: "authentic-indian-tadka-combo",
      category: "spices-herbs",
      description: "Elevate your daily cooking with our ultimate Indian Tadka Combo: 100g each of pure Curry Leaves, Dhaniya (Coriander), Green Chilli, and Lemon powders.",
      long_description: `Bring the authentic taste of Indian kitchens to your meals with ${brandName}'s Authentic Indian Tadka Combo. This essential bundle brings together four of the most used fresh flavorings—Curry Leaves, Coriander (Dhaniya), Green Chilli, and Lemon. We all know the struggle of fresh herbs spoiling in the fridge within days. By sourcing premium produce from local Indian farms and using our advanced low-temperature dehydration technology, we lock in the vibrant colors, sharp heat, tangy zest, and fresh aromas for up to a year. Whether you are tempering a dal (tadka), making instant chutneys, or marinating meats, this combo saves you prep time and eliminates food waste. Zero preservatives, zero artificial colors, zero additives.`,
      bullet_points: [
        "**4-in-1 Flavor Pack**: Includes 100g Curry Leaves, 100g Dhaniya (Coriander), 100g Green Chilli, and 100g Lemon Powder.",
        "**100% Pure & Natural**: Made from fresh, single-ingredient premium produce with absolutely no additives or preservatives.",
        "**Nutrient & Aroma Dense**: Our low-temperature dehydration preserves the authentic vibrant green colors and sharp aromas of fresh herbs.",
        "**Time-Saving Convenience**: Say goodbye to rotting herbs in the fridge. Get instant flavor for your tadkas, curries, and chutneys.",
        "**Long Shelf Life**: Safely packaged in airtight containers to maintain peak freshness for up to 12 months."
      ],
      badges: ["Tadka Combo", "Save 75%", "100% Natural", "Kitchen Essential"],
      specifications: {
        "Brand Name": brandName,
        "Form": "Fine Powder (x4)",
        "Country Of Origin": "India",
        "Diet Type": "Vegetarian, Vegan",
        "Shelf Life": "12 Months from packaging",
        "Storage Instructions": "Store in a cool, dry place. Keep tightly sealed.",
        "_seo_keywords": "indian tadka combo, buy curry leaves powder online, dhaniya powder, green chilli powder, dehydrated lemon powder, herbs combo, instant chutney ingredients",
        "_seo_title": `Buy Authentic Indian Tadka Combo Online | Curry, Dhaniya, Lemon | ${brandName}`,
        "_seo_description": "Elevate your meals with our Indian Tadka Combo: 100g pure Curry Leaves, Dhaniya, Green Chilli, and Lemon powders. 100% natural herbs. Buy now!",
        "_section_Health & Flavor Benefits": "<p>Each ingredient in this combo brings unique value:</p><ul><li><strong>Curry Leaves:</strong> Rich in antioxidants and supports healthy hair and digestion.</li><li><strong>Dhaniya (Coriander):</strong> Adds a cooling effect, fresh aroma, and helps regulate blood sugar.</li><li><strong>Green Chilli:</strong> Provides instant sharp heat and is packed with Vitamin C and metabolism-boosting Capsaicin.</li><li><strong>Lemon:</strong> Adds a zesty, tangy flavor and acts as a powerful natural preservative and detoxifier.</li></ul>",
        "_section_How to Use": "<p>These highly concentrated powders can be used instantly:</p><ul><li><strong>Tadka (Tempering):</strong> Add Curry Leaves and Chilli powder directly into hot oil/ghee for dal or curries.</li><li><strong>Garnishing:</strong> Sprinkle Dhaniya powder over finished dishes instead of fresh coriander.</li><li><strong>Marinades & Beverages:</strong> Use Lemon powder for chicken marinades, chaat, or instant nimbu pani.</li></ul><p><em>Note: 1 teaspoon of powder roughly equals 1 tablespoon of the fresh ingredient.</em></p>"
      },
      hsn_code: "0910",
      gst_rate: 5,
      is_active: true,
      is_in_stock: true,
      image: "/products/authentic-indian-tadka-combo.webp",
      images: [],
      rating: 4.9,
      reviews_count: 142,
      variants: [
        {
          id: variantId,
          weight: "400g Combo (4x100g)",
          price: 349,
          mrp: 1396,
          is_hidden: false,
          is_out_of_stock: false
        }
      ],
      updated_at: new Date().toISOString()
    };

    // Upsert logic
    const { data: existing } = await supabaseAdmin
      .from(TABLES.PRODUCTS)
      .select('id, created_at')
      .eq('slug', 'authentic-indian-tadka-combo')
      .eq('store_id', storeId)
      .single();

    if (existing) {
      productData.id = existing.id;
      productData.created_at = existing.created_at;
      const { error: updErr } = await supabaseAdmin.from(TABLES.PRODUCTS).update(productData).eq('id', existing.id);
      if (updErr) throw new Error("Update Error: " + updErr.message);
    } else {
      productData.created_at = new Date().toISOString();
      const { error: insErr } = await supabaseAdmin.from(TABLES.PRODUCTS).insert(productData);
      if (insErr) throw new Error("Insert Error: " + insErr.message);
    }

    // CLEAR CACHE so it appears in the admin panel immediately
    clearCached(`products_${storeId}`);

    return new Response(JSON.stringify({ success: true, message: 'Authentic Indian Tadka Combo Product successfully Upserted!' }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
