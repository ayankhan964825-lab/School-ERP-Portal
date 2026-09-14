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
      name: "Daily Wellness Superfood Combo",
      slug: "daily-wellness-superfood-combo",
      category: "health-wellness",
      description: "Boost your daily nutrition with our premium Wellness Superfood Combo: 100g each of pure Amla, Beetroot, Carrot, and Moringa powders.",
      long_description: `Elevate your health journey with ${brandName}'s Daily Wellness Superfood Combo. This powerhouse bundle brings together four of nature's most potent ingredients—Amla, Beetroot, Carrot, and Moringa. Carefully sourced from sustainable farms across India, each ingredient undergoes our specialized low-temperature dehydration process to lock in its natural color, aroma, and maximum nutritional profile. Whether you want to boost your immunity with Amla's Vitamin C, improve stamina with Beetroot, enhance glowing skin with Carrot, or get your daily greens from Moringa, this combo is your all-in-one wellness solution. Zero preservatives, zero artificial colors, zero additives.`,
      bullet_points: [
        "**4-in-1 Superfood Pack**: Includes 100g Amla, 100g Beetroot, 100g Carrot, and 100g Moringa Powder.",
        "**100% Pure & Natural**: Made from single-ingredient premium produce with absolutely no additives, added sugar, or preservatives.",
        "**Nutrient Dense**: Our advanced low-temperature dehydration preserves vital nutrients like Vitamin C, Iron, Beta-Carotene, and essential Antioxidants.",
        "**Daily Wellness Made Easy**: The perfect nutrient booster for your morning smoothies, juices, or simple warm water.",
        "**Long Shelf Life**: Safely packaged in airtight containers to maintain peak freshness and potency for up to 12 months."
      ],
      badges: ["Combo Offer", "Save 74%", "100% Natural", "Immunity Booster"],
      specifications: {
        "Brand Name": brandName,
        "Form": "Fine Powder (x4)",
        "Country Of Origin": "India",
        "Diet Type": "Vegetarian, Vegan",
        "Shelf Life": "12 Months from packaging",
        "Storage Instructions": "Store in a cool, dry place. Keep tightly sealed away from direct sunlight.",
        "_seo_keywords": "superfood combo, buy amla powder online, pure beetroot powder, natural carrot powder, organic moringa powder, daily wellness combo, superfoods, immunity booster pack",
        "_seo_title": `Buy Daily Wellness Superfood Combo Online | Pure & Natural | ${brandName}`,
        "_seo_description": "Elevate your health with our premium Superfood Combo: 100g pure Amla, Beetroot, Carrot, and Moringa powders. 100% natural, nutrient-dense. Buy now!",
        "_section_Health Benefits": "<p>Each superfood in this combo offers targeted health benefits:</p><ul><li><strong>Amla:</strong> Extremely rich in Vitamin C, boosts immunity, and supports hair/skin health.</li><li><strong>Beetroot:</strong> Enhances blood flow, stamina, and provides a natural pre-workout boost.</li><li><strong>Carrot:</strong> Packed with Beta-Carotene for healthy vision and glowing skin.</li><li><strong>Moringa:</strong> A nutrient powerhouse loaded with iron, calcium, and essential amino acids.</li></ul>",
        "_section_How to Use": "<p>Easily incorporate these powders into your daily routine:</p><ul><li><strong>Morning Detox:</strong> Mix half a teaspoon of Amla or Moringa in warm water.</li><li><strong>Smoothies & Juices:</strong> Blend Beetroot and Carrot powder into your favorite drinks for a nutritional kick.</li><li><strong>Oats & Yogurt:</strong> Sprinkle over your breakfast bowls.</li><li><strong>Baking:</strong> Add natural color and nutrition to pancakes, muffins, or energy bites.</li></ul>"
      },
      hsn_code: "2106",
      gst_rate: 5,
      is_active: true,
      is_in_stock: true,
      image: "/products/daily-wellness-superfood-combo.webp",
      images: [],
      rating: 4.9,
      reviews_count: 95,
      variants: [
        {
          id: variantId,
          weight: "400g Combo (4x100g)",
          price: 399,
          mrp: 1526,
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
      .eq('slug', 'daily-wellness-superfood-combo')
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

    return new Response(JSON.stringify({ success: true, message: 'Superfood Combo Product successfully Upserted!' }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
