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
      name: "The Ultimate Kitchen Essentials Combo",
      slug: "kitchen-essentials-combo",
      category: "spices-herbs",
      description: "Upgrade your daily cooking with our premium Kitchen Essentials Combo: 100g each of pure Ginger, Garlic, Red Onion, and Tomato powders.",
      long_description: `Experience the true essence of nature with ${brandName}'s Ultimate Kitchen Essentials Combo. This master bundle brings together our four finest dehydrated powders—Ginger, Garlic, Red Onion, and Tomato—saving you hours of prep time without compromising on quality or taste. Each ingredient is sourced from ethically-managed farms across India and processed using our advanced low-temperature dehydration technology. This locks in the vibrant colors, robust aromas, and maximum nutritional value. Whether you're a professional chef looking for consistent flavor or a health-conscious home cook wanting to elevate everyday meals, this pure powder combo is your perfect kitchen companion. Zero preservatives, zero artificial colors, zero additives.`,
      bullet_points: [
        "**4-in-1 Value Pack**: Includes 100g Ginger, 100g Garlic, 100g Red Onion, and 100g Tomato Powder.",
        "**100% Pure & Natural**: Made from single-ingredient premium produce with absolutely no additives or preservatives.",
        "**Nutrient Dense**: Our low-temperature dehydration preserves up to 98% of natural vitamins, aroma, and flavor.",
        "**Time-Saving Convenience**: Say goodbye to washing, peeling, and chopping. Get instant authentic flavor.",
        "**Long Shelf Life**: Safely packaged in airtight containers to maintain freshness for up to 12 months."
      ],
      badges: ["Combo Offer", "Save 75%", "100% Natural", "Best Seller"],
      specifications: {
        "Brand Name": brandName,
        "Form": "Fine Powder (x4)",
        "Country Of Origin": "India",
        "Diet Type": "Vegetarian, Vegan",
        "Shelf Life": "12 Months from packaging",
        "Storage Instructions": "Store in a cool, dry place. Keep tightly sealed.",
        "_seo_keywords": "kitchen spices combo, buy ginger powder online, pure garlic powder, dehydrated red onion powder, natural tomato powder, combo pack",
        "_seo_title": `Buy Kitchen Essentials Spices Combo Online | Pure & Natural | ${brandName}`,
        "_seo_description": "Upgrade your cooking with our premium Kitchen Essentials Combo: 100g pure Ginger, Garlic, Onion, and Tomato powders. 100% natural, no preservatives. Buy now!",
        "_section_Health Benefits": "<p>Each powder in this combo brings its own unique health benefits:</p><ul><li><strong>Ginger:</strong> Aids digestion and boosts immunity.</li><li><strong>Garlic:</strong> Excellent for heart health and reducing blood pressure.</li><li><strong>Red Onion:</strong> Rich in antioxidants and supports healthy skin.</li><li><strong>Tomato:</strong> Packed with Lycopene, great for skin and vision.</li></ul>",
        "_section_How to Use": "<p>Our powders are highly concentrated. Use them as direct replacements for fresh ingredients in:</p><ul><li>Curries, Gravies, and Soups</li><li>Dry Rubs and Meat Marinades</li><li>Salad Dressings and Dips</li><li>Flavoring Rice and Pasta dishes</li></ul><p><em>Note: 1 teaspoon of powder roughly equals 1 tablespoon of the fresh ingredient.</em></p>"
      },
      hsn_code: "0910",
      gst_rate: 5,
      is_active: true,
      is_in_stock: true,
      image: "/products/kitchen-essentials-combo.webp",
      images: [],
      rating: 5,
      reviews_count: 12,
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

    // Upsert so if they ran the previous seed, we overwrite it with the SEO version
    const { data: existing } = await supabaseAdmin
      .from(TABLES.PRODUCTS)
      .select('id, created_at')
      .eq('slug', 'kitchen-essentials-combo')
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

    // Also try to delete the old "kitchen-special-combo" if it exists from the previous seed
    await supabaseAdmin.from(TABLES.PRODUCTS).delete().eq('slug', 'kitchen-special-combo');

    // CLEAR CACHE so it appears in the admin panel immediately
    clearCached(`products_${storeId}`);

    return new Response(JSON.stringify({ success: true, message: 'SEO Optimized Combo Product successfully Upserted!' }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
