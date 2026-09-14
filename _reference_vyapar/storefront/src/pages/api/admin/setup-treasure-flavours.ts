import type { APIRoute } from 'astro';
import { supabaseAdmin, clearCached } from '../../../lib/database';
import { TABLES } from '../../../lib/constants';
import crypto from 'node:crypto';

// Replace string to generate a slug
function toSlug(str: string) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export const GET: APIRoute = async () => {
  if (!supabaseAdmin) {
    return new Response('Supabase not configured', { status: 500 });
  }

  try {
    const rawData = [
      {
          "name": "Lemon Pickle",
          "slug": "lemon-pickle",
          "price": 85,
          "mrp_price": 100,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": "Best Offer",
          "image": "images/7100/2026/06/28/1782640321/WhatsAppImage2026-06-21at15.39.55(2).jpeg",
          "category": "Veg Pickle",
          "category_icon": "images/7100/2026/01/26/1769425819/ChatGPTImageJan26,2026,04_38_15PM(1).png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Gongura Pickle",
          "slug": "gongura-pickle",
          "price": 90,
          "mrp_price": 110,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": "Limited Time",
          "image": "images/7100/2026/06/28/1782640421/WhatsAppImage2026-06-21at11.50.06.jpeg",
          "category": "Veg Pickle",
          "category_icon": "images/7100/2026/01/26/1769425819/ChatGPTImageJan26,2026,04_38_15PM(1).png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Amla Pickle",
          "slug": "amla-pickle",
          "price": 100,
          "mrp_price": 120,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": "Fresh",
          "image": "images/7100/2026/06/28/1782640453/WhatsAppImage2026-06-21at15.39.55.jpeg",
          "category": "Veg Pickle",
          "category_icon": "images/7100/2026/01/26/1769425819/ChatGPTImageJan26,2026,04_38_15PM(1).png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Red Chilli Pickle",
          "slug": "red-chilli-pickle",
          "price": 70,
          "mrp_price": 90,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": "Sale",
          "image": "images/7100/2026/06/28/1782640478/WhatsAppImage2026-06-21at15.42.29.jpeg",
          "category": "Veg Pickle",
          "category_icon": "images/7100/2026/01/26/1769425819/ChatGPTImageJan26,2026,04_38_15PM(1).png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "CHANA DAL PODI",
          "slug": "chana-dal-podi",
          "price": 200,
          "mrp_price": 200,
          "special_price": null,
          "unit": 250,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168355/CHANADAL.jpg",
          "category": "Andhra Style Podis",
          "category_icon": "images/7100/2026/01/26/1769425879/ChatGPTImageJan26,2026,04_40_51PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17861,\"product_id\":\"1875197600\",\"variation\":\"500\",\"price\":\"360\",\"mrp_price\":\"400\",\"unit\":\"500\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17862,\"product_id\":\"1875197600\",\"variation\":\"750\",\"price\":\"540\",\"mrp_price\":\"600\",\"unit\":\"750\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17863,\"product_id\":\"1875197600\",\"variation\":\"1000\",\"price\":\"720\",\"mrp_price\":\"800\",\"unit\":\"1000\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "MORINGA CHILLI PODI",
          "slug": "moringa-chilli-podi",
          "price": 210,
          "mrp_price": 210,
          "special_price": null,
          "unit": 250,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168339/MORINGACHILLI.jpg",
          "category": "Andhra Style Podis",
          "category_icon": "images/7100/2026/01/26/1769425879/ChatGPTImageJan26,2026,04_40_51PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17858,\"product_id\":\"628359665\",\"variation\":\"500\",\"price\":\"360\",\"mrp_price\":\"420\",\"unit\":\"500\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17859,\"product_id\":\"628359665\",\"variation\":\"750\",\"price\":\"540\",\"mrp_price\":\"630\",\"unit\":\"750\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17860,\"product_id\":\"628359665\",\"variation\":\"1000\",\"price\":\"720\",\"mrp_price\":\"840\",\"unit\":\"1000\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "FLAX SEEDS PODI",
          "slug": "flax-seeds-podi",
          "price": 230,
          "mrp_price": 230,
          "special_price": null,
          "unit": 250,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168326/FLAXSEEDS.jpg",
          "category": "Andhra Style Podis",
          "category_icon": "images/7100/2026/01/26/1769425879/ChatGPTImageJan26,2026,04_40_51PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17855,\"product_id\":\"1799222411\",\"variation\":\"500\",\"price\":\"400\",\"mrp_price\":\"460\",\"unit\":\"500\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17856,\"product_id\":\"1799222411\",\"variation\":\"750\",\"price\":\"540\",\"mrp_price\":\"690\",\"unit\":\"750\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17857,\"product_id\":\"1799222411\",\"variation\":\"1000\",\"price\":\"720\",\"mrp_price\":\"800\",\"unit\":\"1000\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "GROUND NUT PODI",
          "slug": "ground-nut-podi",
          "price": 210,
          "mrp_price": 210,
          "special_price": null,
          "unit": 250,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168314/GROUNDNUT.jpg",
          "category": "Andhra Style Podis",
          "category_icon": "images/7100/2026/01/26/1769425879/ChatGPTImageJan26,2026,04_40_51PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17852,\"product_id\":\"1241567283\",\"variation\":\"500\",\"price\":\"360\",\"mrp_price\":\"420\",\"unit\":\"500\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17853,\"product_id\":\"1241567283\",\"variation\":\"750\",\"price\":\"540\",\"mrp_price\":\"630\",\"unit\":\"750\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17854,\"product_id\":\"1241567283\",\"variation\":\"1000\",\"price\":\"720\",\"mrp_price\":\"840\",\"unit\":\"1000\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "CURRY LEAF PODI",
          "slug": "curry-leaf-podi",
          "price": 80,
          "mrp_price": 100,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168262/CURRYLEAF.jpg",
          "category": "Andhra Style Podis",
          "category_icon": "images/7100/2026/01/26/1769425879/ChatGPTImageJan26,2026,04_40_51PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17843,\"product_id\":\"1006888825\",\"variation\":\"250 GM\",\"price\":\"200\",\"mrp_price\":\"250\",\"unit\":\"250\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17892,\"product_id\":\"1006888825\",\"variation\":\"500 GM\",\"price\":\"400\",\"mrp_price\":\"500\",\"unit\":\"500\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":19951,\"product_id\":\"1006888825\",\"variation\":\"750 GM\",\"price\":\"600\",\"mrp_price\":\"750\",\"unit\":\"750\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":750,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":19953,\"product_id\":\"1006888825\",\"variation\":\"1000 GM\",\"price\":\"800\",\"mrp_price\":\"1000\",\"unit\":\"1000\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Amla Powder",
          "slug": "dehydrated-powders",
          "price": 219,
          "mrp_price": 379,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Dried / Dehydrated Amla Powder",
          "meta_title": "Dehydrated Fruit & Vegetable Powders | Bulk & Export Supplier I Horeca & Cloud Kitchen I Skin Care",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping.",
          "total_stocks": 1,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168617/AMLAPOWDER.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":18493,\"product_id\":\"108341071\",\"variation\":\"200 grams\",\"price\":\"379\",\"mrp_price\":\"749\",\"unit\":\"200\",\"stock\":\"30000\",\"unlimited_stock\":0,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"30\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Betroot Powder",
          "slug": "betroot-powder",
          "price": 219,
          "mrp_price": 399,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Dired/Dehydrated Powders",
          "meta_title": "Premium dehydrated fruit and vegetable powders for individuals, manufacturers, cosmetic brands, cloud kitchens and global importers. Bulk, retail & export worldwide.",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168602/BETROOTPOWDER.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":18494,\"product_id\":\"2061119960\",\"variation\":\"200grams\",\"price\":\"379\",\"mrp_price\":\"799\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":200,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Tomato Powder",
          "slug": "tomato-powder",
          "price": 189,
          "mrp_price": 349,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Dried/Dehydrated Powders",
          "meta_title": "Dehydrated Fruit & Vegetable Powders | Bulk & Export Supplier I Horeca & Cloud Kitchen I Skin Care",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168589/TOMATOPOWDER.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":18511,\"product_id\":\"471819540\",\"variation\":\"200 grams\",\"price\":\"339\",\"mrp_price\":\"699\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":200,\"sku\":\"\",\"image\":\"images\\/7100\\/2026\\/03\\/02\\/1772452604\\/Tomsto.jpg.jpeg\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Spinach Powder",
          "slug": "spinach-powder",
          "price": 219,
          "mrp_price": 499,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Dried/Dehydrated Powders",
          "meta_title": "Dehydrated Fruit & Vegetable Powders | Bulk & Export Supplier I Horeca & Cloud Kitchen I Skin Care",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168563/SPINACHPOWDER.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":18512,\"product_id\":\"1847584317\",\"variation\":\"200 grams\",\"price\":\"339\",\"mrp_price\":\"999\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":200,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Moringa Powder",
          "slug": "moringa-powder",
          "price": 219,
          "mrp_price": 399,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Dreid/Dehydrated Powders",
          "meta_title": "Dehydrated Fruit & Vegetable Powders | Bulk & Export Supplier I Horeca & Cloud Kitchen I Skin Care",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping.",
          "total_stocks": 1,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168544/MORINGAPOWDER.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":18513,\"product_id\":\"1519957665\",\"variation\":\"200 grams\",\"price\":\"339\",\"mrp_price\":\"749\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":200,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Ginger Powder",
          "slug": "ginger-powder",
          "price": 189,
          "mrp_price": 349,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Dried/Dehydrated Powder",
          "meta_title": "Dehydrated Fruit & Vegetable Powders | Bulk & Export Supplier I Horeca & Cloud Kitchen I Skin Care",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168529/GINGERPOWDER.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":18514,\"product_id\":\"1329053913\",\"variation\":\"200 grams\",\"price\":\"329\",\"mrp_price\":\"699\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":200,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Garlic Powder",
          "slug": "garlic-powder",
          "price": 189,
          "mrp_price": 349,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Dried/Dehydrated Powders",
          "meta_title": "Premium dehydrated fruit and vegetable powders for individuals, manufacturers, cosmetic brands, cloud kitchens and global importers. Bulk, retail & export worldwide.",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168513/GARLICPOWDER.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":18515,\"product_id\":\"1522548029\",\"variation\":\"200grams\",\"price\":\"339\",\"mrp_price\":\"699\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":200,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Carrot Powder",
          "slug": "carrot-powder",
          "price": 189,
          "mrp_price": 349,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Dried/Dehydrated Powders\r\n\u00a0\r\n\u00a0\r\n\u00a0\r\n\u00a0\r\npow",
          "meta_title": "Dehydrated Fruit & Vegetable Powders | Bulk & Export Supplier I Horeca & Cloud Kitchen I Skin Care",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168411/CARROTPOWDER.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":18516,\"product_id\":\"1484571377\",\"variation\":\"200 grams\",\"price\":\"339\",\"mrp_price\":\"699\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":200,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Wellness Combo 100Gram Each",
          "slug": "wellness-combo",
          "price": 559,
          "mrp_price": 627,
          "special_price": null,
          "unit": 1,
          "unit_type": "box",
          "description": "Dried/Dehydrated",
          "meta_title": "Premium dehydrated fruit and vegetable powders for individuals, manufacturers, cosmetic brands, cloud kitchens and global importers. Bulk, retail & export worldwide.",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": null,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168665/WELLNESSCOMBO.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Immunity Booster Combo 100Gram Each",
          "slug": "immunity-booster-combo-100gram-each",
          "price": 729,
          "mrp_price": 816,
          "special_price": null,
          "unit": 1,
          "unit_type": "box",
          "description": "Dried/Dehydrated",
          "meta_title": "Premium dehydrated fruit and vegetable powders for individuals, manufacturers, cosmetic brands, cloud kitchens and global importers. Bulk, retail & export worldwide.",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": null,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778168656/IMMUNITYBOOSTERCOMBO.png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Natural Detox Combo 100Gram Each",
          "slug": "natural-detox-combo-100gram-each",
          "price": 549,
          "mrp_price": 627,
          "special_price": null,
          "unit": 1,
          "unit_type": "box",
          "description": "Dired/Dehydrated",
          "meta_title": "Premium dehydrated fruit and vegetable powders for individuals, manufacturers, cosmetic brands, cloud kitchens and global importers. Bulk, retail & export worldwide.",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": null,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778170605/Untitleddesign(3).png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Daily Green Combo 100Gram Each",
          "slug": "daily-green-combo-100gram-each",
          "price": 579,
          "mrp_price": 657,
          "special_price": null,
          "unit": 1,
          "unit_type": "box",
          "description": "Dired/Dehydrated",
          "meta_title": "Premium dehydrated fruit and vegetable powders for individuals, manufacturers, cosmetic brands, cloud kitchens and global importers. Bulk, retail & export worldwide.",
          "meta_description": "Our premium dehydrated fruit and vegetable powders are specially processed to preserve natural color, flavor, aroma, and nutrients. Designed for individual consumers, food manufacturers, cosmetic and skincare brands, cloud kitchens, international importers, and export distributors, our powders meet global quality standards.\r\n\r\nWe supply both retail and bulk quantities, making our products ideal for:\r\n\r\n\u2022 Food & beverage manufacturing\r\n\u2022 Bakery & confectionery production\r\n\u2022 Nutraceutical & health formulations\r\n\u2022 Skincare and cosmetic formulations\r\n\u2022 HoReCa & cloud kitchens\r\n\u2022 Private label & contract manufacturing\r\n\u2022 International wholesale & distribution\r\n\r\nOur export-ready dehydrated powders offer excellent solubility, extended shelf life, and consistent quality for global markets.\r\n\r\nPartner with us for reliable supply, competitive pricing, and worldwide shipping",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": null,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/07/1778170683/Untitleddesign(4).png",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/03/01/1772350450/Untitleddesign.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Hibiscus Dry FLowers",
          "slug": "herbal-tea",
          "price": 160,
          "mrp_price": 200,
          "special_price": null,
          "unit": 20,
          "unit_type": "piece",
          "description": null,
          "meta_title": "Hibiscus Dry Flower Herbal Tea | 100% Natural & Caffeine-Free | Treasure Flavours",
          "meta_description": "Buy 100% natural hibiscus dry flowers for herbal tea. Rich in antioxidants, caffeine-free, and perfect for detox, skin health & refreshing drinks.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": null,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/06/28/1782640918/ChatGPTImageJun28,2026,03_31_21PM.png",
          "category": "Herbal Tea",
          "category_icon": "images/7100/2026/04/25/1777097797/ChatGPTImageApr25,2026,11_46_13AM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Butterfly Pea Flower",
          "slug": "herbaltea",
          "price": 180,
          "mrp_price": 300,
          "special_price": null,
          "unit": 20,
          "unit_type": "piece",
          "description": null,
          "meta_title": "Hibiscus Dry Flower Herbal Tea | 100% Natural & Caffeine-Free | Treasure Flavours",
          "meta_description": "Buy 100% natural butterfly pea flower tea. Rich in antioxidants, caffeine-free, and color-changing blue tea perfect for detox, relaxation & wellness.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": null,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/06/28/1782640933/ChatGPTImageJun28,2026,03_27_34PM.png",
          "category": "Herbal Tea",
          "category_icon": "images/7100/2026/04/25/1777097797/ChatGPTImageApr25,2026,11_46_13AM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Chamomile Dry Flower",
          "slug": "chamomile-dry-flower",
          "price": 180,
          "mrp_price": 300,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": null,
          "meta_title": "Chamomile Dry Flowers | Premium Herbal Tea | Treasure Flavours",
          "meta_description": "Buy premium Chamomile Dry Flowers from Treasure Flavours. 100% natural, caffeine-free herbal tea that promotes relaxation, restful sleep, and daily wellness. No preservatives or artificial additives.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/06/28/1782642731/CHAMOMILE(1).png",
          "category": "Herbal Tea",
          "category_icon": "images/7100/2026/04/25/1777097797/ChatGPTImageApr25,2026,11_46_13AM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Rose Dry Flower",
          "slug": "rose-dry-flower",
          "price": 130,
          "mrp_price": 200,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": null,
          "meta_title": "Rose Dry Flowers | Premium Herbal Tea & Culinary Use | Treasure Flavours",
          "meta_description": "Buy premium Rose Dry Flowers from Treasure Flavours. 100% natural, preservative-free, and perfect for herbal tea, desserts, beverages, and wellness. Rich in natural aroma and antioxidants.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/06/28/1782642838/ROSE(2).png",
          "category": "Herbal Tea",
          "category_icon": "images/7100/2026/04/25/1777097797/ChatGPTImageApr25,2026,11_46_13AM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "HONEY GULKHAND",
          "slug": "honey-gulkhand",
          "price": 120,
          "mrp_price": 150,
          "special_price": null,
          "unit": 250,
          "unit_type": "gm",
          "description": "Treasure Flavours Honey Gulkand&nbsp;\r\nExperience the timeless goodness of Treasure Flavours Honey Gulkand, a delicious blend of 45% premium rose petals, 50% pure forest honey, and 5% rock sugar. Prepared using carefully selected ingredients, this traditional recipe combines the natural aroma of roses with the rich sweetness of honey to create a flavorful and refreshing delicacy.\r\nHoney Gulkand can be enjoyed directly from the jar, spread on toast, mixed into warm milk, stirred into herbal tea, blended with yogurt, or used as a topping for desserts and ice cream. Its rich floral taste and smooth texture make it a delightful addition to your daily routine.\r\nWhy You'll Love It\r\n\r\n\r\nMade with 45% premium rose petals\r\n\r\n\r\nSweetened with 50% pure forest honey\r\n\r\n\r\nContains only 5% rock sugar\r\n\r\n\r\nNo artificial colours\r\n\r\n\r\nNo artificial flavours\r\n\r\n\r\nNo preservatives\r\n\r\n\r\nCrafted with carefully selected natural ingredients\r\n\r\n\r\nRich floral aroma and delicious taste\r\n\r\n\r\nSuitable for everyday enjoyment\r\n\r\n\r\nHow to Use\r\n\r\n\r\nEnjoy 1&ndash;2 teaspoons directly.\r\n\r\n\r\nMix with warm milk or herbal tea.\r\n\r\n\r\nAdd to yogurt, smoothies, or fruit bowls.\r\n\r\n\r\nUse as a topping for desserts, pancakes, or ice cream.\r\n\r\n\r\nSpread on bread, chapati, or crackers.\r\n\r\n\r\nIngredients\r\n\r\n\r\nRose Petals &ndash; 45%\r\n\r\n\r\nPure Forest Honey &ndash; 50%\r\n\r\n\r\nRock Sugar &ndash; 5%\r\n\r\n\r\nStorage Instructions\r\nStore in a cool, dry place away from direct sunlight. Keep the lid tightly closed after use. Use a clean and dry spoon every time.\r\nTreasure Flavours Honey Gulkand is a delightful fusion of traditional ingredients and natural sweetness, offering a rich floral taste that's perfect for everyday enjoyment.",
          "meta_title": "Honey Gulkand with Pure Forest Honey & Rose Petals | Treasure Flavours",
          "meta_description": "Buy Treasure Flavours Honey Gulkand made with 45% premium rose petals, 50% pure forest honey, and 5% rock sugar. A delicious traditional delicacy with no artificial colours, flavours, or preservatives. Perfect to enjoy with milk, desserts, or as a daily treat.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/07/02/1782988864/WhatsAppImage2026-07-01at9.20.26AM.jpeg",
          "category": "Natural Foods",
          "category_icon": "images/7100/2026/07/02/1782989169/ChatGPTImageJul2,2026,04_14_52PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      }
    ];

    const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0'; // HARDCODED TREASURE FLAVOURS ID

    // 0. Safety Cleanup: Wipe only THIS store's existing products & categories to avoid duplicates
    console.log(`[Safety] Wiping existing products for store: ${storeId}`);
    await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).delete().eq('store_id', storeId);
    await supabaseAdmin.from(TABLES.PRODUCTS).delete().eq('store_id', storeId);
    await supabaseAdmin.from(TABLES.CATEGORIES).delete().eq('store_id', storeId);

    // 1. Upsert the tenant record in 'stores' table
    const { error: storeErr } = await supabaseAdmin.from(TABLES.STORES).upsert({
      id: storeId,
      subdomain: 'treasureflavours',
      is_active: true,
      created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (storeErr) throw new Error('Store Upsert Failed: ' + storeErr.message);

    // 2. Upsert the tenant settings
    const settingsId = storeId; // Use storeId as settingsId for consistency or upsert by store_id
    
    // Check if settings exist first
    const { data: existingSettings } = await supabaseAdmin.from(TABLES.SETTINGS).select('id').eq('store_id', storeId).single();
    const actualSettingsId = existingSettings?.id || crypto.randomUUID();

    const { error: setErr } = await supabaseAdmin.from(TABLES.SETTINGS).upsert({
      id: actualSettingsId,
      store_id: storeId,
      brand_name: "TREASURE FLAVOURS - EVERY BITE MATTERS",
      store_name: "Treasure Flavours",
      contact_email: "connect@treasureflavours.com",
      contact_phone: "9148229076",
      currency: "INR",
      domain: "treasureflavours.com",
      pages_content: {
        company_details: {
          address: "no.5 kbar road austin town layout neelasandra bengaluru - 560047",
          fssai: "APEDA, HACCP AND GMP",
          gstin: "29AAZFT1344H1ZL"
        },
        website_theme: { active_preset: "terracotta" },
        website_design: { active_design: "earthy" },
        home_story_text: "Treasure Flavours is a premier manufacturer of dehydrated fruit and vegetable powders. We specialize in B2B supply, contract manufacturing, and export, ensuring global quality standards with our APEDA, HACCP, and GMP licenses.",
        home_story_bullets: ["Global Export Ready", "B2B & Contract Manufacturing", "APEDA, HACCP & GMP Certified"],
        about_hero_subtitle: "ABOUT TREASURE FLAVOURS",
        about_hero_title: "Quality Powders for<br/>Global Markets",
        about_hero_text: "Treasure Flavours is your trusted partner for premium dehydrated fruit and vegetable powders. With deep expertise in B2B supply and contract manufacturing, we export our products worldwide, backed by strict APEDA, HACCP, and GMP certifications.",
        about_mission_title: "Our Mission",
        about_mission_text: "To deliver uncompromised quality in every batch of our dehydrated powders.\n\nWhether you need contract manufacturing, bulk B2B supply, or export-ready products, our state-of-the-art facilities and APEDA, HACCP, and GMP licenses ensure we meet international standards.",
        about_approach_title: "Our Approach",
        about_approach_text: "We believe in transparency, hygiene, and sustainability.\n\nOur manufacturing process is strictly monitored to comply with HACCP and GMP guidelines. From raw material sourcing to final export packaging, we ensure absolute perfection for our B2B partners worldwide."
      },
      created_at: existingSettings ? undefined : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (setErr) throw new Error("Settings Upsert Failed: " + setErr.message);

    // 3. Create Categories
    const categoriesMap: Record<string, string> = {}; // Name to ID
    const uniqueCategories = [...new Set(rawData.map(p => p.category))];
    for (const cat of uniqueCategories) {
      if (!cat) continue;
      const catId = crypto.randomUUID();
      const { error: catErr } = await supabaseAdmin.from(TABLES.CATEGORIES).insert({
        id: catId,
        store_id: storeId,
        name: cat,
        slug: toSlug(cat),
        is_active: true,
        created_at: new Date().toISOString()
      });
      if (catErr) throw new Error("Category Insert Failed: " + catErr.message);
      categoriesMap[cat] = toSlug(cat); // use slug for categories
    }

    // 4. Create Products & Variants
    for (const item of rawData) {
      const productId = crypto.randomUUID();
      const slug = item.slug || toSlug(item.name);

      let parsedVariants: any[] = [];
      if (item.variants) {
        try {
          parsedVariants = JSON.parse(item.variants);
        } catch (e) {
          console.warn("Failed to parse variants for", item.name);
        }
      }

      // Always include the base product as the primary variant
      parsedVariants.unshift({
        variation: `${item.unit} ${item.unit_type}`,
        price: item.price,
        mrp_price: item.mrp_price
      });

      const { error: prodErr } = await supabaseAdmin.from(TABLES.PRODUCTS).insert({
        id: productId,
        store_id: storeId,
        name: item.name,
        slug: slug,
        description: item.description,
        category: item.category ? categoriesMap[item.category] : null,
        base_price: item.price,
        base_mrp: item.mrp_price,
        is_active: true,
        is_in_stock: true,
        image: item.image || "",
        images: item.image ? [item.image] : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      if (prodErr) throw new Error(`Product ${item.name} Insert Failed: ` + prodErr.message);

      // Variants Insert
      for (const v of parsedVariants) {
        const variantId = crypto.randomUUID();
        const priceNum = Number(v.price) || item.price || 0;
        const mrpNum = Number(v.mrp_price) || item.mrp_price || (priceNum * 1.5);
        
        let weightStr = String(v.variation || `${v.unit} ${item.unit_type}`);
        if (weightStr === 'undefined' || weightStr === 'null') {
            weightStr = 'Default';
        }

        const { error: varErr } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).insert({
          id: variantId,
          product_id: productId,
          store_id: storeId,
          weight: weightStr,
          price: priceNum,
          mrp: mrpNum,
          is_out_of_stock: false,
          created_at: new Date().toISOString()
        });
        if (varErr) throw new Error(`Variant ${weightStr} Insert Failed: ` + varErr.message);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Treasure Flavours Seeded Successfully!',
      store_id: storeId
    }), { status: 200, headers: {'content-type':'application/json'} });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500, headers: {'content-type':'application/json'} });
  }
};
