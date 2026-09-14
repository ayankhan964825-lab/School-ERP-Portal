import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';
import crypto from 'node:crypto';

function toSlug(str: string) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function runSeed() {
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
          "badge": null,
          "image": "images/7100/2026/06/28/1782640428/WhatsAppImage2026-06-21at15.42.06.jpeg",
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
          "badge": null,
          "image": "images/7100/2026/06/28/1782640455/WhatsAppImage2026-06-21at15.42.17.jpeg",
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
          "image": "images/7100/2026/05/07/1778168270/CURRYLEAF.jpg",
          "category": "Andhra Style Podis",
          "category_icon": "images/7100/2026/01/26/1769425879/ChatGPTImageJan26,2026,04_40_51PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17848,\"product_id\":\"1898717804\",\"variation\":\"250\",\"price\":\"180\",\"mrp_price\":\"220\",\"unit\":\"250\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17849,\"product_id\":\"1898717804\",\"variation\":\"500\",\"price\":\"340\",\"mrp_price\":\"380\",\"unit\":\"500\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17850,\"product_id\":\"1898717804\",\"variation\":\"750\",\"price\":\"510\",\"mrp_price\":\"590\",\"unit\":\"750\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"},{\"id\":17851,\"product_id\":\"1898717804\",\"variation\":\"1000\",\"price\":\"680\",\"mrp_price\":\"800\",\"unit\":\"1000\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Amla Powder",
          "slug": "amla-powder",
          "price": 219,
          "mrp_price": 379,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "It contains essential vitamins and minerals that can prevent hair fall and help against premature greying. Additionally, massaging amla powder onto the scalp boosts blood circulation, bringing more oxygen and nutrients to hair follicles. This promotes healthier and faster hair growth.\r\nIt contains essential vitamins and minerals that can prevent hair fall and help against premature greying. Additionally, massaging amla powder onto the scalp boosts blood circulation, bringing more oxygen and nutrients to hair follicles. This promotes healthier and faster hair growth.",
          "meta_title": "Pure Amla Powder | Boosts Immunity & Hair Health",
          "meta_description": "Discover the powerful benefits of our 100% natural Amla powder. Rich in vitamin C, it boosts immunity, enhances hair health, and promotes glowing skin. Experience holistic wellness with this potent Ayurvedic superfood.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/02/10/1770732822/AMLAPOWDER.jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17847,\"product_id\":\"2147321685\",\"variation\":\"200\",\"price\":\"420\",\"mrp_price\":\"758\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Betroot Powder",
          "slug": "betroot-powder",
          "price": 219,
          "mrp_price": 399,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Beetroot powder can be used in water to create a nutritional juice. It can also be used in smoothies, greens, or other beverages. Usually, 1 tsp per day is a good amount. What are the benefits of drinking beet root powder?\r\nHealth benefits of beet powder include lowering blood pressure, improving blood circulation, helping with digestion, boosting energy, and fighting inflammation. It is also packed with vitamins and minerals, including calcium, iron, potassium, and magnesium.",
          "meta_title": "Organic Beetroot Powder | Energy & Stamina Booster",
          "meta_description": "Fuel your active lifestyle with our organic Beetroot powder. Packed with nitrates, it improves stamina, supports heart health, and boosts energy levels naturally. Elevate your workouts with this nutrient-dense superfood.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/02/10/1770732782/BEETROOT.jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17846,\"product_id\":\"1506541170\",\"variation\":\"200\",\"price\":\"420\",\"mrp_price\":\"798\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Tomato Powder",
          "slug": "tomato-powder",
          "price": 189,
          "mrp_price": 349,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Due to its long shelf-life, this versatile powder can be used as a substitute for fresh tomatoes in various recipes. Use tomato powder to make tomato paste or sauce, or add it to soups and stews for a burst of flavour. It can also be used as a seasoning for roasted vegetables, meats, and salads.\r\nUse tomato powder to make tomato paste or sauce, or add it to soups and stews for a burst of flavour. It can also be used as a seasoning for roasted vegetables, meats, and salads.",
          "meta_title": "Natural Tomato Powder | Versatile & Flavorful Seasoning",
          "meta_description": "Add a burst of tangy flavor to your dishes with our natural Tomato powder. Perfect for soups, sauces, and seasonings, it offers convenience without compromising on taste. Enhance your culinary creations effortlessly.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/02/10/1770732599/TOMOTO.jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17841,\"product_id\":\"891500854\",\"variation\":\"200\",\"price\":\"360\",\"mrp_price\":\"698\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Spinach Powder",
          "slug": "spinach-powder",
          "price": 219,
          "mrp_price": 499,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Spinach powder is an excellent source of protein, fibre, antioxidant, and minerals, making it a suitable ingredient to be used in the formulation of foods with high nutritional or biological values.\r\nSpinach powder is an excellent source of protein, fibre, antioxidant, and minerals, making it a suitable ingredient to be used in the formulation of foods with high nutritional or biological values.",
          "meta_title": "Nutrient-Rich Spinach Powder | Daily Greens Supplement",
          "meta_description": "Elevate your daily nutrition with our nutrient-rich Spinach powder. A convenient way to add greens to your diet, it supports digestion, boosts energy, and fortifies immunity. Simply mix into smoothies, soups, or baked goods for a healthy boost.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/02/10/1770732440/SPINACH.jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17840,\"product_id\":\"968417834\",\"variation\":\"200\",\"price\":\"420\",\"mrp_price\":\"998\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Moringa Powder",
          "slug": "moringa-powder",
          "price": 219,
          "mrp_price": 399,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "The powder is used as a medicine. It is used to treat conditions such as malnutrition, water purification, and numerous ailments including diabetes, inflammation, and bacterial infections. It has high nutritional value and a range of health benefits.\r\nThe powder is used as a medicine. It is used to treat conditions such as malnutrition, water purification, and numerous ailments including diabetes, inflammation, and bacterial infections. It has high nutritional value and a range of health benefits.",
          "meta_title": "Organic Moringa Powder | The Miracle Tree Superfood",
          "meta_description": "Nourish your body with our organic Moringa powder, derived from the \"miracle tree.\" Bursting with vitamins, minerals, and antioxidants, it revitalizes skin, strengthens bones, and promotes overall vitality. Incorporate this superfood into your daily routine for optimal health.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/02/10/1770732386/MORINGA(1).jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17839,\"product_id\":\"1295963242\",\"variation\":\"200\",\"price\":\"420\",\"mrp_price\":\"798\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Ginger Powder",
          "slug": "ginger-powder",
          "price": 189,
          "mrp_price": 349,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Taking ginger by mouth is commonly used to treat many types of nausea and vomiting. It's also used for menstrual cramps, osteoarthritis, diabetes, migraine headaches, and other conditions, but there is no good scientific evidence to support many of these uses.\r\nTaking ginger by mouth is commonly used to treat many types of nausea and vomiting. It's also used for menstrual cramps, osteoarthritis, diabetes, migraine headaches, and other conditions, but there is no good scientific evidence to support many of these uses.",
          "meta_title": "Premium Ginger Powder | Digestive Aid & Immune Support",
          "meta_description": "Spice up your health with our premium Ginger powder. Renowned for its digestive benefits and immune-boosting properties, it adds warmth and flavor to teas, curries, and baked goods. Embrace wellness with this versatile kitchen staple.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/02/10/1770732320/GINGER(1).jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17838,\"product_id\":\"403079942\",\"variation\":\"200\",\"price\":\"360\",\"mrp_price\":\"698\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Garlic Powder",
          "slug": "garlic-powder",
          "price": 189,
          "mrp_price": 349,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "Consuming garlic powder on a regular basis may help boost your immune system, which can reduce your risk of getting sick. Eating garlic powder might also help lower your blood pressure, which can protect against heart disease.\r\nConsuming garlic powder on a regular basis may help boost your immune system, which can reduce your risk of getting sick. Eating garlic powder might also help lower your blood pressure, which can protect against heart disease.",
          "meta_title": "Pure Garlic Powder | Flavorful & Heart-Healthy",
          "meta_description": "Elevate your recipes with our pure Garlic powder. Known for its robust flavor and cardiovascular benefits, it enhances savory dishes while promoting heart health and immunity. Enjoy the goodness of garlic without the hassle of peeling.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/02/10/1770732252/GARLIC(1).jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17837,\"product_id\":\"1239843657\",\"variation\":\"200\",\"price\":\"360\",\"mrp_price\":\"698\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Carrot Powder",
          "slug": "carrot-powder",
          "price": 189,
          "mrp_price": 349,
          "special_price": null,
          "unit": 100,
          "unit_type": "gm",
          "description": "The powder has been found to be rich in natural vitamin A (beta carotene), making it an excellent dietary supplement. Further, it is also a rich source of other essential vitamins and minerals including Vitamin C, Potassium, Iron, Calcium and Magnesium.\r\nThe powder has been found to be rich in natural vitamin A (beta carotene), making it an excellent dietary supplement. Further, it is also a rich source of other essential vitamins and minerals including Vitamin C, Potassium, Iron, Calcium and Magnesium.",
          "meta_title": "Natural Carrot Powder | Vision & Skin Support",
          "meta_description": "See the difference with our natural Carrot powder. Loaded with beta-carotene, it promotes healthy vision, vibrant skin, and strong immunity. Mix into juices, baked goods, or sauces for a nutritious boost of color and flavor.\r\n",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/02/10/1770732087/CARROT(1).jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": "[{\"id\":17836,\"product_id\":\"892182069\",\"variation\":\"200\",\"price\":\"360\",\"mrp_price\":\"698\",\"unit\":\"200\",\"stock\":\"0\",\"unlimited_stock\":1,\"maximum_stock_for_single_buy\":\"0\",\"weight\":0,\"sku\":\"\",\"image\":\"\",\"variant_type\":\"normal\"}]"
      },
      {
          "name": "Wellness Combo",
          "slug": "wellness-combo",
          "price": 559,
          "mrp_price": 627,
          "special_price": null,
          "unit": 1,
          "unit_type": "box",
          "description": "Nourish your body from within with our Wellness Combo. Featuring nutrient-packed Moringa Powder, antioxidant-rich Beetroot Powder, and vitamin C-loaded Amla Powder, this powerhouse trio supports immunity, vitality, and glowing skin. Perfect for smoothies, juices, or daily health shots!",
          "meta_title": "Wellness Combo (Moringa, Beetroot, Amla) - Superfood Boost",
          "meta_description": "Boost your vitality with our Wellness Combo! Includes Moringa, Beetroot, and Amla powders to support immunity, energy, and radiant skin naturally. Add to your daily routine today.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": "Best Offer",
          "image": "images/7100/2026/02/26/1772111162/COMBO03-100.jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Immunity Booster Combo",
          "slug": "immunity-booster-combo",
          "price": 729,
          "mrp_price": 816,
          "special_price": null,
          "unit": 1,
          "unit_type": "box",
          "description": "Strengthen your body&rsquo;s natural defenses with our Immunity Booster Combo. Packed with vitamin-rich Amla Powder, immune-supporting Garlic Powder, digestion-friendly Ginger Powder, and nutrient-dense Moringa Powder, this blend is your ultimate shield for everyday wellness. Ideal for teas, soups, or daily health drinks!",
          "meta_title": "Immunity Booster Combo (Amla, Garlic, Ginger, Moringa)",
          "meta_description": "Protect and strengthen your health with the Immunity Booster Combo. Featuring Amla, Garlic, Ginger, and Moringa powders to enhance immunity, digestion, and overall wellness.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": "Best Offer",
          "image": "images/7100/2026/02/26/1772111226/COMBO04-100.jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Natural Detox Combo",
          "slug": "natural-detox-combo",
          "price": 549,
          "mrp_price": 627,
          "special_price": null,
          "unit": 1,
          "unit_type": "box",
          "description": "Cleanse and revitalize with our Natural Detox Combo. This purifying trio includes Beetroot Powder for blood flow, Spinach Powder for essential greens, and Carrot Powder for skin health and vision. Perfect for creating refreshing detox drinks, smoothies, or wholesome meals!",
          "meta_title": "Natural Detox Combo (Beetroot, Spinach, Carrot)",
          "meta_description": "Revitalize your body with the Natural Detox Combo! A purifying blend of Beetroot, Spinach, and Carrot powders to support digestion, energy, and a healthy glow.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": "Sale",
          "image": "images/7100/2026/02/26/1772111048/COMBO02-100.jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Daily Green Combo",
          "slug": "daily-green-combo",
          "price": 579,
          "mrp_price": 657,
          "special_price": null,
          "unit": 1,
          "unit_type": "box",
          "description": "Get your essential daily greens with our Daily Green Combo. Combining the powerhouse nutrients of Moringa Powder, Spinach Powder, and Amla Powder, this trio helps boost energy, improve digestion, and support overall health. Add a scoop to your smoothies, soups, or juices for a natural wellness upgrade!",
          "meta_title": "Daily Green Combo (Moringa, Spinach, Amla) - Vitality Boost",
          "meta_description": "Fuel your day with the Daily Green Combo! Featuring Moringa, Spinach, and Amla powders for a natural boost in energy, immunity, and overall wellness. Perfect for smoothies and juices.",
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": "Sale",
          "image": "images/7100/2026/02/26/1772110901/COMBO01-100.jpg",
          "category": "Dehydrated Powders",
          "category_icon": "images/7100/2026/01/26/1769426372/ChatGPTImageJan26,2026,04_48_25PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Hibiscus Dry Flowers",
          "slug": "hibiscus-dry-flowers",
          "price": 160,
          "mrp_price": 200,
          "special_price": null,
          "unit": 20,
          "unit_type": "piece",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/23/1779532551/HIBISCUS.jpg",
          "category": "Herbal Tea",
          "category_icon": "images/7100/2026/01/26/1769425752/ChatGPTImageJan26,2026,04_37_03PM.png",
          "sub_category": null,
          "sub_category_icon": null,
          "variants": null
      },
      {
          "name": "Butterfly Pea Flower",
          "slug": "butterfly-pea-flower",
          "price": 180,
          "mrp_price": 300,
          "special_price": null,
          "unit": 20,
          "unit_type": "piece",
          "description": null,
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/23/1779532675/BUTTERFLYPEA.jpg",
          "category": "Herbal Tea",
          "category_icon": "images/7100/2026/01/26/1769425752/ChatGPTImageJan26,2026,04_37_03PM.png",
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
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/23/1779532588/CHAMOMILE.jpg",
          "category": "Herbal Tea",
          "category_icon": "images/7100/2026/01/26/1769425752/ChatGPTImageJan26,2026,04_37_03PM.png",
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
          "meta_title": null,
          "meta_description": null,
          "total_stocks": 0,
          "unlimited_stock": 1,
          "maximum_stock_for_single_buy": 0.0,
          "sku": null,
          "badge": null,
          "image": "images/7100/2026/05/23/1779532630/ROSE.jpg",
          "category": "Herbal Tea",
          "category_icon": "images/7100/2026/01/26/1769425752/ChatGPTImageJan26,2026,04_37_03PM.png",
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
      name: 'Treasure Flavours',
      subdomain: 'treasureflavours',
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
      pages_content: {
        company_details: {
          address: "no.5 kbar road austin town layout neelasandra bengaluru - 560047",
          fssai: "APEDA, HACCP AND GMP",
          gstin: "29AAZFT1344H1ZL"
        },
        website_theme: { active_preset: "terracotta" },
        website_design: { active_design: "earthy" }
      }
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
          name: weightStr,
          weight: weightStr,
          price: priceNum,
          original_price: mrpNum,
          is_out_of_stock: false,
          created_at: new Date().toISOString()
        });
        if (varErr) throw new Error(`Variant ${weightStr} Insert Failed: ` + varErr.message);
      }
    }

    console.log("Seeding complete!");
  } catch (err: any) {
    console.error("Seeding error:", err);
  }
}

// VERY IMPORTANT: Our DB proxy requires 'SUPER_ADMIN_BYPASS' context to perform cross-tenant deletes/upserts.
storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  runSeed().catch(console.error);
});
