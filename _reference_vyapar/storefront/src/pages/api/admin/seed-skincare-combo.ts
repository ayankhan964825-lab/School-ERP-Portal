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
      name: "Radiant Glow Skincare Combo",
      slug: "radiant-glow-skincare-combo",
      category: "health-wellness",
      description: "Achieve a natural, radiant glow with our premium Skincare Combo: Beetroot (100g), Haldi (100g), Multani Mitti (100g), and Rose Powder (50g).",
      long_description: `Unveil your skin's natural brilliance with ${brandName}'s Radiant Glow Skincare Combo. Designed for the ultimate DIY natural skincare routine, this powerful bundle features everything you need for clear, glowing, and healthy skin. Deep cleanse and control oil with mineral-rich Multani Mitti, target blemishes and brighten your complexion with pure Haldi (Turmeric), add a natural pinkish flush with Beetroot powder, and soothe your pores with premium Rose Petal powder. Perfect for all skin types, this chemical-free pack allows you to create custom face packs right at home. Zero artificial colors, zero preservatives, 100% natural beauty.`,
      bullet_points: [
        "**Complete DIY Skincare Pack**: Includes Beetroot (100g), Pure Haldi (100g), Multani Mitti (100g), and delicate Rose Petal Powder (50g).",
        "**100% Pure & Chemical-Free**: Made from natural ingredients with zero parabens, artificial colors, or preservatives.",
        "**Deep Cleansing & Exfoliation**: Multani Mitti effectively removes excess oil and impurities from deep within the pores.",
        "**Natural Brightening**: Haldi (Turmeric) and Beetroot work together to naturally brighten skin tone and reduce blemishes.",
        "**Soothing & Toning**: Rose powder cools the skin, tightens pores, and provides a naturally refreshing floral aroma."
      ],
      badges: ["Beauty Combo", "Save 76%", "100% Natural", "Glowing Skin"],
      specifications: {
        "Brand Name": brandName,
        "Form": "Fine Powder (x4)",
        "Country Of Origin": "India",
        "Skin Type": "Suitable for all skin types (Oily, Dry, Combination)",
        "Shelf Life": "12 Months from packaging",
        "Storage Instructions": "Store in a cool, dry place. Keep away from moisture.",
        "_seo_keywords": "skincare combo pack, buy multani mitti online, pure rose powder for face, natural beetroot powder lip tint, haldi face pack, natural beauty combo, skincare, DIY face mask ingredients",
        "_seo_title": `Buy Radiant Glow Skincare Combo Online | Natural Face Pack | ${brandName}`,
        "_seo_description": "Get clear, glowing skin with our natural Skincare Combo: Beetroot, Haldi, Multani Mitti, & Rose Powder. 100% chemical-free DIY face pack. Buy now!",
        "_section_Skin Benefits": "<p>Each ingredient targets specific skin concerns:</p><ul><li><strong>Multani Mitti:</strong> Absorbs excess oil, fights acne, and deep cleanses pores.</li><li><strong>Haldi (Turmeric):</strong> Anti-bacterial properties help clear blemishes and impart a golden glow.</li><li><strong>Beetroot:</strong> Rich in Vitamin C, it brightens the skin and gives a natural pink tint to lips and cheeks.</li><li><strong>Rose Powder:</strong> Acts as a natural astringent, cools irritated skin, and maintains pH balance.</li></ul>",
        "_section_How to Use (DIY Face Packs)": "<p>Create your custom natural face masks:</p><ul><li><strong>For Glowing Skin:</strong> Mix 1 tsp Multani Mitti, 1/2 tsp Beetroot powder, a pinch of Haldi, and water/rose water. Apply for 15 mins and wash off.</li><li><strong>For Oil Control:</strong> Mix Multani Mitti and Rose powder with water. Apply twice a week.</li><li><strong>For Spot Treatment:</strong> Mix a tiny amount of Haldi with aloe vera gel and apply directly on blemishes.</li></ul>"
      },
      hsn_code: "3304",
      gst_rate: 5,
      is_active: true,
      is_in_stock: true,
      image: "/products/radiant-glow-skincare-combo.webp",
      images: [],
      rating: 4.8,
      reviews_count: 72,
      variants: [
        {
          id: variantId,
          weight: "350g Combo",
          price: 299,
          mrp: 1246,
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
      .eq('slug', 'radiant-glow-skincare-combo')
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

    return new Response(JSON.stringify({ success: true, message: 'Skincare Combo Product successfully Upserted!' }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
