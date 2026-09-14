import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

const productContent: Record<string, any> = {
  // VEG PICKLES
  "lemon-pickle": {
    description: "Authentic Andhra-style Lemon Pickle, made with sun-dried lemons and cold-pressed oil for a tangy, spicy burst of flavor.",
    long_description: "<p>Bring home the authentic taste of Andhra with our traditional <strong>Lemon Pickle</strong>. Made from handpicked, farm-fresh lemons and a secret blend of roasted spices, this pickle is sun-dried to perfection to preserve its natural tanginess and aroma. Free from artificial colors and preservatives, it is the perfect accompaniment to hot rice, parathas, and curd rice.</p><ul><li>100% natural ingredients with no artificial preservatives</li><li>Handcrafted using traditional Andhra recipes</li><li>Matured in cold-pressed oil for superior health benefits</li></ul>",
    bullet_points: ["Authentic Andhra Style Recipe", "Sun-dried for natural preservation", "Made with cold-pressed oil", "No artificial colors or preservatives", "Perfect pairing for meals & snacks"],
    badges: ["100% Natural", "No Preservatives", "Authentic Taste", "Handmade"],
    specifications: {
      "Form": "Pickle", "Diet Type": "Vegetarian", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Authentic Andhra Lemon Pickle | 100% Natural & Homemade",
      "_seo_description": "Buy premium homemade Lemon Pickle online. Authentic Andhra style, tangy, spicy, and made with cold-pressed oil. Zero preservatives.",
      "_seo_keywords": "lemon pickle, nimbu ka achar, andhra lemon pickle, homemade pickle, natural pickle, treasure flavours",
      "_tags": "lemon pickle, nimbu achar, spicy pickle, andhra pickle",
      "_section_How to Use": "<p>Mix a small spoonful with hot steamed rice and ghee, or serve as a zesty side dish with parathas, idlis, and dosas. Always use a dry spoon to serve.</p>"
    },
    hsn_code: "20019000", gst_rate: 12
  },
  "gongura-pickle": {
    description: "A classic South Indian delicacy made from fresh Gongura (Sorrel) leaves, offering a unique tangy and spicy flavor profile.",
    long_description: "<p>Experience the pride of Andhra cuisine with our signature <strong>Gongura Pickle</strong>. Crafted from fresh, locally sourced sorrel leaves, this pickle delivers a naturally tart and fiery flavor that dances on your palate. It is slowly cooked in cold-pressed oil with traditional spices to ensure maximum flavor retention and shelf life without any chemical additives.</p>",
    bullet_points: ["Made with fresh, authentic Gongura leaves", "Naturally tart and spicy flavor profile", "Slow-cooked in cold-pressed oil", "Zero artificial colors or additives", "Traditional South Indian delicacy"],
    badges: ["Authentic Taste", "100% Natural", "No Preservatives", "Handmade"],
    specifications: {
      "Form": "Pickle", "Diet Type": "Vegetarian", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Gongura Pickle | Authentic Andhra Style Sorrel Leaf Pickle",
      "_seo_description": "Shop the best authentic Gongura Pickle. Made with fresh sorrel leaves, traditional spices, and cold-pressed oil. 100% natural.",
      "_seo_keywords": "gongura pickle, sorrel leaf pickle, andhra gongura achar, spicy gongura, south indian pickle, treasure flavours",
      "_tags": "gongura pickle, andhra pickle, spicy pickle, sorrel leaves",
      "_section_How to Use": "<p>Best enjoyed with steaming hot rice and a dollop of ghee. Also pairs wonderfully with rotis, dosas, and dal rice.</p>"
    },
    hsn_code: "20019000", gst_rate: 12
  },
  "amla-pickle": {
    description: "Nutrient-rich Indian Gooseberry (Amla) pickle, perfectly balancing sour, spicy, and savory flavors.",
    long_description: "<p>Boost your immunity while satisfying your taste buds with our <strong>Amla Pickle</strong>. Known as the Indian Gooseberry, Amla is packed with Vitamin C and antioxidants. Our pickle marinates fresh, whole amla in a rich blend of mustard, fenugreek, and cold-pressed oil, creating a mouth-watering combination of sourness and spice.</p>",
    bullet_points: ["Rich in Vitamin C and antioxidants", "Made with farm-fresh Indian Gooseberries", "Perfect balance of tanginess and spice", "No artificial preservatives used", "Aids in digestion and immunity"],
    badges: ["Immunity Booster", "100% Natural", "Handmade", "No Preservatives"],
    specifications: {
      "Form": "Pickle", "Diet Type": "Vegetarian", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Premium Amla Pickle | Tangy & Spicy Gooseberry Achar",
      "_seo_description": "Delicious and healthy Amla (Gooseberry) Pickle made in authentic Andhra style. Rich in Vitamin C, no preservatives.",
      "_seo_keywords": "amla pickle, gooseberry achar, amla achar, healthy pickle, andhra amla pickle, treasure flavours",
      "_tags": "amla pickle, gooseberry pickle, healthy achar, spicy amla",
      "_section_How to Use": "<p>Enjoy with your daily meals, parathas, or rice. A healthy and flavorful addition to any Indian thali.</p>"
    },
    hsn_code: "20019000", gst_rate: 12
  },
  "red-chilli-pickle": {
    description: "A fiery and robust pickle made from sun-dried red chilies and traditional ground spices for true spice lovers.",
    long_description: "<p>Ignite your taste buds with our <strong>Red Chilli Pickle (Pandu Mirapakaya Pachadi)</strong>. Made for those who crave authentic heat, this pickle uses premium, sun-dried red chilies blended with tamarind, garlic, and freshly roasted spices. The result is a robust, fiery, and deeply flavorful condiment that elevates any meal.</p>",
    bullet_points: ["Made from premium sun-dried red chilies", "Intense, fiery, and authentic flavor", "Blended with tangy tamarind and garlic", "Preserved naturally in cold-pressed oil", "A staple for spice enthusiasts"],
    badges: ["Extra Spicy", "100% Natural", "Authentic Taste", "Handmade"],
    specifications: {
      "Form": "Pickle", "Diet Type": "Vegetarian", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Spicy Red Chilli Pickle | Authentic Andhra Pachadi",
      "_seo_description": "Buy fiery and flavorful Red Chilli Pickle online. Handcrafted with traditional spices and cold-pressed oil. For true spice lovers.",
      "_seo_keywords": "red chilli pickle, lal mirch achar, pandu mirapakaya pachadi, spicy pickle, andhra chilli pickle, treasure flavours",
      "_tags": "red chilli pickle, spicy achar, mirch ka achar, andhra style",
      "_section_How to Use": "<p>Mix a tiny amount with hot rice and ghee, or use it as a spicy dip for dosas and parathas. Warning: Very Spicy!</p>"
    },
    hsn_code: "20019000", gst_rate: 12
  },

  // PODIS
  "chana-dal-podi": {
    description: "A protein-rich, aromatic spice blend made from roasted chana dal and traditional spices, perfect for idlis and dosas.",
    long_description: "<p>Elevate your breakfast with our authentic <strong>Chana Dal Podi</strong>. Dry-roasted to perfection, this coarse spice powder combines premium Bengal gram (chana dal) with red chilies, cumin, and garlic. It adds a delicious nutty crunch and savory heat to your meals, making it a healthy and flavorful replacement for traditional chutneys.</p>",
    bullet_points: ["Rich in plant-based protein", "Dry-roasted for a perfect nutty crunch", "Authentic South Indian flavor profile", "No artificial colors or MSG", "Instantly elevates breakfast dishes"],
    badges: ["Protein Rich", "100% Natural", "No Preservatives", "Authentic"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegetarian", "Shelf Life": "9 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Authentic Chana Dal Podi | Idli Milagai Podi",
      "_seo_description": "Delicious and crunchy Chana Dal Podi made with roasted lentils and spices. The perfect accompaniment for Idli, Dosa, and Rice.",
      "_seo_keywords": "chana dal podi, idli podi, gun powder, dal podi, andhra podi, treasure flavours",
      "_tags": "podi, idli podi, chana dal powder, gun powder, spice blend",
      "_section_How to Use": "<p>Mix with ghee or sesame oil and serve as a dip for idlis and dosas. Can also be sprinkled over hot rice or upma.</p>"
    },
    hsn_code: "21039040", gst_rate: 12
  },
  "moringa-chilli-podi": {
    description: "A superfood spice blend combining nutrient-dense moringa leaves with roasted chilies for a healthy, fiery kick.",
    long_description: "<p>Experience the ultimate fusion of health and taste with our <strong>Moringa Chilli Podi</strong>. We’ve taken the traditional Andhra spice powder and supercharged it with shade-dried Moringa (Drumstick) leaves, known for their incredible antioxidant and vitamin profile. Combined with roasted lentils and chilies, this podi is a delicious way to add superfoods to your daily diet.</p>",
    bullet_points: ["Infused with nutrient-rich Moringa leaves", "High in iron, calcium, and antioxidants", "Perfect balance of heat and earthy flavors", "100% vegan and natural", "Delicious superfood addition to meals"],
    badges: ["Superfood", "Immunity Booster", "100% Natural", "Vegan"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "9 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Moringa Chilli Podi | Healthy Superfood Spice Blend",
      "_seo_description": "Buy Moringa Chilli Podi online. A nutrient-dense, spicy gunpowder blend perfect for rice, idli, and dosa. 100% natural superfood.",
      "_seo_keywords": "moringa podi, drumstick leaf powder, spicy moringa powder, healthy podi, idli podi, treasure flavours",
      "_tags": "moringa podi, superfood, healthy spice, idli podi",
      "_section_How to Use": "<p>Mix with ghee or oil for a breakfast dip, or sprinkle directly over hot rice, salads, or roasted vegetables for a healthy spice kick.</p>"
    },
    hsn_code: "21039040", gst_rate: 12
  },
  "flax-seeds-podi": {
    description: "A heart-healthy spice powder made with roasted flax seeds, lentils, and aromatic spices. Rich in Omega-3.",
    long_description: "<p>Boost your daily nutrition effortlessly with our <strong>Flax Seeds Podi (Avisi Ginjala Karam)</strong>. Carefully crafted by dry-roasting premium flax seeds with lentils, garlic, and red chilies, this podi is a powerhouse of Omega-3 fatty acids and dietary fiber. Enjoy the deep, nutty flavor while nourishing your heart and digestive system.</p>",
    bullet_points: ["Rich in Omega-3 fatty acids and fiber", "Promotes heart health and digestion", "Nutty, savory, and mildly spicy taste", "Zero preservatives or artificial flavors", "Traditional Andhra healthy recipe"],
    badges: ["Omega-3 Rich", "Heart Healthy", "100% Natural", "Vegan"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "9 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Flax Seeds Podi | Avisi Ginjala Karam | Omega-3 Rich",
      "_seo_description": "Buy healthy Flax Seeds Podi (Avisi Ginjala Karam). Rich in Omega-3 and fiber, perfectly roasted with traditional spices for rice and dosas.",
      "_seo_keywords": "flax seeds podi, avisi ginjala karam, alsi podi, omega 3 powder, healthy podi, treasure flavours",
      "_tags": "flax seeds, healthy podi, omega 3, avisi ginjala karam",
      "_section_How to Use": "<p>Best served with hot rice and a spoonful of ghee. Can also be used as a flavorful coating for roasted potatoes or paneer.</p>"
    },
    hsn_code: "21039040", gst_rate: 12
  },
  "ground-nut-podi": {
    description: "A creamy, nutty, and savory spice blend made from roasted peanuts and red chilies. A kid-friendly favorite.",
    long_description: "<p>Add a rich, nutty flavor to your meals with our <strong>Ground Nut Podi (Palli Karam)</strong>. Made from high-quality, slow-roasted peanuts blended with cumin, garlic, and mild red chilies, this powder is slightly creamy when mixed with oil and offers a universally loved taste. It's packed with protein and healthy fats, making it a nutritious addition to any meal.</p>",
    bullet_points: ["Made from premium slow-roasted peanuts", "Rich in plant protein and healthy fats", "Mildly spicy and highly flavorful", "Kid-friendly and versatile", "100% natural ingredients"],
    badges: ["Protein Rich", "Nutty Flavor", "100% Natural", "No Preservatives"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegetarian", "Shelf Life": "9 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Ground Nut Podi | Palli Karam | Roasted Peanut Spice Blend",
      "_seo_description": "Delicious Ground Nut (Peanut) Podi made with roasted peanuts and traditional spices. Perfect side for Idli, Dosa, and Rice.",
      "_seo_keywords": "ground nut podi, peanut podi, palli karam, peanut spice powder, idli podi, treasure flavours",
      "_tags": "peanut podi, palli karam, ground nut powder, idli side dish",
      "_section_How to Use": "<p>Mix with warm oil or ghee to create a thick chutney for idlis, or sprinkle over curd rice for a delightful crunch.</p>"
    },
    hsn_code: "21039040", gst_rate: 12
  },
  "curry-leaf-podi": {
    description: "An aromatic, iron-rich spice powder made with fresh curry leaves and lentils. Excellent for hair and digestion.",
    long_description: "<p>Harness the natural benefits of curry leaves with our <strong>Curry Leaf Podi (Karivepaku Karam)</strong>. Instead of picking curry leaves out of your food, enjoy them fully blended into this flavorful spice mix. Shade-dried to retain their vibrant color and nutrients, the leaves are roasted with Bengal gram, coriander seeds, and chilies to create a powder that promotes hair growth, digestion, and iron absorption.</p>",
    bullet_points: ["Packed with iron, vitamins, and antioxidants", "Promotes healthy hair and digestion", "Made with shade-dried fresh curry leaves", "Authentic South Indian taste", "No artificial colors or MSG"],
    badges: ["Iron Rich", "Hair Health", "100% Natural", "Authentic"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegetarian", "Shelf Life": "9 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Curry Leaf Podi | Karivepaku Karam | Iron Rich Spice Blend",
      "_seo_description": "Buy pure Curry Leaf Podi online. A delicious and healthy Karivepaku Karam rich in iron and perfect for rice, idlis, and dosas.",
      "_seo_keywords": "curry leaf podi, karivepaku karam, kadi patta powder, healthy podi, idli podi, treasure flavours",
      "_tags": "curry leaf podi, karivepaku, healthy powder, iron rich",
      "_section_How to Use": "<p>Enjoy with hot rice and ghee. Also tastes amazing when sprinkled inside a dosa before folding.</p>"
    },
    hsn_code: "21039040", gst_rate: 12
  },

  // DEHYDRATED POWDERS
  "amla-powder": {
    description: "100% pure, dehydrated Amla (Indian Gooseberry) powder. A powerhouse of Vitamin C for immunity, skin, and hair health.",
    long_description: "<p>Discover the holistic benefits of our <strong>Premium Amla Powder</strong>. Sourced from the finest Indian Gooseberries and carefully dehydrated at low temperatures to preserve its heat-sensitive Vitamin C content. Regular consumption supports a strong immune system, promotes glowing skin, and prevents premature hair greying. Pure, natural, and highly potent.</p>",
    bullet_points: ["Extremely rich in natural Vitamin C", "Low-temperature dehydrated to lock in nutrients", "Supports immune system and digestion", "Promotes healthy hair growth and glowing skin", "100% pure with no additives or fillers"],
    badges: ["Vitamin C", "Immunity Booster", "100% Pure", "Vegan"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Pure Amla Powder | Dehydrated Indian Gooseberry",
      "_seo_description": "Buy 100% pure, dehydrated Amla Powder. Rich in Vitamin C, perfect for immunity, hair masks, and daily health routines.",
      "_seo_keywords": "amla powder, gooseberry powder, dehydrated amla, pure amla, vitamin c powder, treasure flavours",
      "_tags": "amla powder, vitamin c, immunity, hair care, natural powder",
      "_section_How to Use": "<p>Mix 1 tsp in a glass of warm water on an empty stomach. Can also be mixed with water or yogurt to create a nourishing hair mask.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  "betroot-powder": {
    description: "Vibrant, naturally sweet Beetroot powder packed with nitrates and iron for enhanced stamina, blood flow, and a natural food colorant.",
    long_description: "<p>Elevate your energy levels and culinary creations with our <strong>Beetroot Powder</strong>. Made from fresh, deep-red beetroots, this powder is a natural source of dietary nitrates, which help improve blood flow and exercise stamina. Its vibrant color and mild, earthy sweetness make it an excellent, healthy alternative to artificial red food coloring in smoothies, lattes, and baked goods.</p>",
    bullet_points: ["Natural energy and stamina booster", "Rich in dietary nitrates, iron, and folate", "Excellent natural red food colorant", "Retains the sweet, earthy flavor of fresh beets", "100% natural, no added sugar or colors"],
    badges: ["Stamina Booster", "Iron Rich", "Natural Colorant", "100% Pure"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Pure Beetroot Powder | Natural Stamina Booster & Colorant",
      "_seo_description": "Shop premium dehydrated Beetroot Powder. Boost your stamina naturally and use as a healthy food colorant for smoothies and baking.",
      "_seo_keywords": "beetroot powder, beet powder, dehydrated beetroot, natural red color, pre workout powder, treasure flavours",
      "_tags": "beetroot powder, energy booster, natural color, iron rich",
      "_section_How to Use": "<p>Add 1-2 tsp to smoothies, juices, or pre-workout drinks. Use a pinch in cakes, frostings, or pastas for a stunning natural red hue.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  "tomato-powder": {
    description: "Tangy, rich, and versatile Tomato powder made from vine-ripened tomatoes. Instantly adds depth and color to any dish.",
    long_description: "<p>Say goodbye to spoiled tomatoes with our ultra-convenient <strong>Dehydrated Tomato Powder</strong>. Made from perfectly ripe, juicy tomatoes, this fine powder captures the intense, sweet-tart flavor of the fresh fruit. It's a versatile pantry staple that easily dissolves in water to create instant tomato paste, sauce, or soup, saving you prep time without compromising on authentic taste.</p>",
    bullet_points: ["Made from 100% vine-ripened tomatoes", "Instantly converts into paste, sauce, or soup base", "Rich in Lycopene and Vitamin C", "Long shelf life, eliminates food waste", "Perfect for camping, soups, and curries"],
    badges: ["Time Saver", "Rich in Lycopene", "100% Pure", "Versatile"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Dehydrated Tomato Powder | Instant Tomato Paste Alternative",
      "_seo_description": "Buy 100% pure Tomato Powder. Instantly make tomato paste, sauce, or soup. A versatile, long-lasting pantry staple rich in Lycopene.",
      "_seo_keywords": "tomato powder, dehydrated tomato, instant tomato paste, dry tomato powder, natural tomato flavoring, treasure flavours",
      "_tags": "tomato powder, cooking staple, instant sauce, lycopene",
      "_section_How to Use": "<p>Mix 1 part powder with 2 parts water for instant tomato sauce. Sprinkle directly onto popcorn, roasted nuts, or into soups for a tangy kick.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  "spinach-powder": {
    description: "Nutrient-dense Spinach powder, packed with iron, fiber, and vitamins. A quick way to add greens to your daily diet.",
    long_description: "<p>Easily boost your daily vegetable intake with our <strong>Dehydrated Spinach Powder</strong>. We gently dry fresh spinach leaves to retain their brilliant green color and massive nutritional profile, including iron, calcium, and Vitamin K. It has a mild flavor that blends seamlessly into your meals, making it a fantastic way to sneak greens into kids' food or your morning smoothies.</p>",
    bullet_points: ["Concentrated source of iron and Vitamin K", "Easily sneak greens into any meal", "Made from 100% fresh, shade-dried spinach", "No artificial colors or preservatives", "Mild flavor, perfect for smoothies and baking"],
    badges: ["Iron Rich", "Super Greens", "100% Pure", "Vegan"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Premium Spinach Powder | Dehydrated Super Greens",
      "_seo_description": "Buy pure Spinach Powder online. An easy way to add iron, fiber, and vitamins to smoothies, rotis, and pasta. 100% natural superfood.",
      "_seo_keywords": "spinach powder, palak powder, dehydrated spinach, green powder, green smoothie powder, treasure flavours",
      "_tags": "spinach powder, super green, iron rich, palak powder",
      "_section_How to Use": "<p>Blend 1 tsp into smoothies, or knead it into roti, paratha, or pasta dough for a nutritional boost and natural green color.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  "moringa-powder": {
    description: "The ultimate green superfood! 100% pure Moringa leaf powder, rich in antioxidants, plant protein, and essential amino acids.",
    long_description: "<p>Rejuvenate your body with the 'Miracle Tree'—<strong>Moringa Powder</strong>. Made from shade-dried moringa leaves, this superfood powder is one of the most nutrient-dense greens on the planet. It contains all 9 essential amino acids, making it a complete plant protein. High in calcium, iron, and antioxidants, it provides a natural, caffeine-free energy boost while reducing inflammation.</p>",
    bullet_points: ["Complete plant protein with all essential amino acids", "Massive antioxidant and anti-inflammatory properties", "Boosts energy and stamina without caffeine", "Supports healthy blood sugar levels", "100% pure, shade-dried leaves"],
    badges: ["Superfood", "Protein Rich", "Antioxidants", "Vegan"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Pure Moringa Leaf Powder | The Ultimate Green Superfood",
      "_seo_description": "Buy 100% pure Moringa Powder. A powerful superfood rich in protein, iron, and antioxidants. Boost your daily energy naturally.",
      "_seo_keywords": "moringa powder, drumstick leaf powder, superfood green powder, vegan protein, organic moringa, treasure flavours",
      "_tags": "moringa powder, superfood, energy booster, plant protein",
      "_section_How to Use": "<p>Mix 1 tsp into your morning smoothie, juice, or oatmeal. Can also be steeped as a herbal tea or added to soups.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  "ginger-powder": {
    description: "Warm, spicy, and highly aromatic dehydrated Ginger powder. Perfect for baking, teas, and soothing digestion.",
    long_description: "<p>Bring warmth and flavor to your kitchen with our <strong>Dehydrated Ginger Powder (Sonth)</strong>. Milled from premium, sun-dried ginger roots, this fine powder packs a concentrated, spicy punch. It is a staple in Ayurvedic medicine for its potent anti-inflammatory properties and ability to soothe digestive issues, nausea, and cold symptoms.</p>",
    bullet_points: ["Potent, concentrated ginger flavor", "Excellent for soothing colds and digestion", "Rich in anti-inflammatory gingerol", "Long shelf life without losing aroma", "Perfect for baking, teas, and curries"],
    badges: ["Digestive Aid", "Anti-inflammatory", "100% Pure", "Aromatic"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Premium Ginger Powder (Sonth) | Dry Ginger Spice",
      "_seo_description": "Shop 100% pure dry Ginger Powder (Sonth). Highly aromatic, great for digestion, immunity teas, baking, and Indian curries.",
      "_seo_keywords": "ginger powder, sonth powder, dry ginger, saunth, ginger spice, digestive aid, treasure flavours",
      "_tags": "ginger powder, sonth, spice, digestive, immunity",
      "_section_How to Use": "<p>Add a pinch to your masala chai, warm water with honey for a sore throat, or use it in baking gingerbread and cookies.</p>"
    },
    hsn_code: "09101210", gst_rate: 5
  },
  "garlic-powder": {
    description: "Intense, savory Garlic powder that dissolves easily. A massive time-saver for marinades, soups, and daily cooking.",
    long_description: "<p>Skip the peeling and chopping with our convenient <strong>Dehydrated Garlic Powder</strong>. Made from fresh, high-quality garlic cloves gently dried and ground to a fine powder, it offers an intense, savory flavor that disperses evenly into any dish. It’s perfect for dry rubs, marinades, and garlic bread, ensuring you get the robust taste of garlic without the sticky hands.</p>",
    bullet_points: ["Saves time: No peeling or chopping required", "Intense, concentrated garlic flavor", "Disperses evenly in liquids and dry rubs", "Long shelf life with zero preservatives", "100% pure garlic, no fillers"],
    badges: ["Time Saver", "100% Pure", "Intense Flavor", "Versatile"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Pure Garlic Powder | Dehydrated Garlic Spice",
      "_seo_description": "Buy 100% pure Garlic Powder online. A versatile, intense time-saver for marinades, soups, and everyday cooking. Zero preservatives.",
      "_seo_keywords": "garlic powder, dehydrated garlic, garlic spice, dry garlic, garlic seasoning, treasure flavours",
      "_tags": "garlic powder, cooking staple, savory spice, time saver",
      "_section_How to Use": "<p>Use 1/4 tsp of garlic powder to replace one fresh garlic clove. Perfect for dry rubs, garlic bread, soups, and marinades.</p>"
    },
    hsn_code: "07129020", gst_rate: 5
  },
  "carrot-powder": {
    description: "Naturally sweet and vibrant Carrot powder. Rich in Beta-Carotene for healthy eyes and glowing skin.",
    long_description: "<p>Enjoy the sweetness and nutrition of carrots all year round with our <strong>Dehydrated Carrot Powder</strong>. Packed with Beta-Carotene (Vitamin A), antioxidants, and fiber, this powder is a convenient way to boost your daily vegetable intake. Its natural sweetness and bright orange color make it a fantastic addition to baked goods, smoothies, and soups.</p>",
    bullet_points: ["Rich in Beta-Carotene (Vitamin A)", "Promotes healthy vision and skin", "Naturally sweet flavor, no added sugar", "Excellent natural orange food coloring", "100% pure, gently dehydrated carrots"],
    badges: ["Vitamin A Rich", "Eye Health", "Natural Colorant", "Vegan"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Premium Carrot Powder | Rich in Vitamin A & Beta-Carotene",
      "_seo_description": "Shop 100% pure Carrot Powder. Naturally sweet, rich in Vitamin A, and perfect for smoothies, baking, and healthy coloring.",
      "_seo_keywords": "carrot powder, dehydrated carrot, beta carotene powder, vitamin a powder, natural orange color, treasure flavours",
      "_tags": "carrot powder, vitamin a, healthy baking, natural color",
      "_section_How to Use": "<p>Blend into smoothies, mix into pancake or waffle batter, or use as a natural food coloring for frostings and cakes.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  
  // COMBOS
  "wellness-combo": {
    description: "A holistic bundle of our finest dehydrated superfoods to support your daily wellness and vitality.",
    long_description: "<p>Take a step towards a healthier lifestyle with our <strong>Wellness Combo</strong>. This curated bundle includes our best-selling superfood powders designed to provide a comprehensive boost of vitamins, minerals, and antioxidants. It's the perfect starter pack for anyone looking to incorporate natural, plant-based nutrition into their daily routine.</p>",
    bullet_points: ["Curated selection of premium superfood powders", "Comprehensive daily nutritional support", "Rich in natural vitamins, minerals, and antioxidants", "Perfect for smoothies, juices, and healthy cooking", "Great value bundle for holistic health"],
    badges: ["Combo Pack", "Super Saver", "100% Natural", "Holistic Health"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Wellness Superfood Combo Pack | Natural Daily Nutrition",
      "_seo_description": "Buy the Wellness Combo Pack featuring our best dehydrated superfood powders. Boost your daily vitality and immunity naturally.",
      "_seo_keywords": "wellness combo, superfood bundle, healthy powder combo, natural nutrition pack, treasure flavours",
      "_tags": "combo pack, wellness, superfoods, health bundle",
      "_section_How to Use": "<p>Mix the powders individually or together in your daily smoothies, juices, or warm water for a nutritional boost.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  "immunity-booster-combo": {
    description: "A powerful combination of immune-boosting natural powders, including Amla and Ginger, to strengthen your body's defenses.",
    long_description: "<p>Fortify your body's natural defenses with our <strong>Immunity Booster Combo</strong>. We've paired our most potent Vitamin C and anti-inflammatory powders, such as Amla and Ginger, into one powerful bundle. Regular consumption of these pure, natural ingredients helps build resilience against seasonal colds, flu, and infections.</p>",
    bullet_points: ["Packed with massive amounts of natural Vitamin C", "Strong anti-inflammatory and antibacterial properties", "Helps ward off seasonal colds and infections", "100% natural, no synthetic vitamins", "Ideal for daily immunity teas and shots"],
    badges: ["Immunity Booster", "Vitamin C Rich", "Combo Pack", "100% Pure"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Immunity Booster Combo | Amla & Ginger Powder Bundle",
      "_seo_description": "Shop the Immunity Booster Combo. A powerful blend of Vitamin C rich Amla and anti-inflammatory Ginger to protect your health naturally.",
      "_seo_keywords": "immunity combo, amla ginger bundle, immunity booster powder, vitamin c combo, natural immunity, treasure flavours",
      "_tags": "combo pack, immunity, vitamin c, health bundle",
      "_section_How to Use": "<p>Combine 1/2 tsp of each powder in warm water with a spoonful of honey for a potent morning immunity shot.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  "natural-detox-combo": {
    description: "Cleanse and rejuvenate your body from within with our carefully selected natural detox powders.",
    long_description: "<p>Flush out toxins and revitalize your system with our <strong>Natural Detox Combo</strong>. This bundle features earth's finest cleansing ingredients that support liver function, improve digestion, and promote clear, glowing skin. Incorporate this combo into your daily routine for a gentle, natural detox without harsh chemicals.</p>",
    bullet_points: ["Supports liver health and natural detoxification", "Aids in digestion and reduces bloating", "Promotes clear, glowing skin from within", "Gentle, plant-based cleansing action", "Perfect for morning detox drinks"],
    badges: ["Detox", "Digestive Health", "Combo Pack", "Vegan"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Natural Detox Combo Pack | Plant-Based Cleansing",
      "_seo_description": "Buy the Natural Detox Combo. Gently cleanse your body, improve digestion, and boost liver health with our pure superfood powders.",
      "_seo_keywords": "detox combo, natural detox, cleanse bundle, detox powder, digestive health, treasure flavours",
      "_tags": "combo pack, detox, cleanse, digestive health",
      "_section_How to Use": "<p>Mix into warm water with a squeeze of lemon and consume first thing in the morning on an empty stomach for best results.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },
  "daily-green-combo": {
    description: "Your daily dose of essential greens in one bundle! Packed with Spinach, Moringa, and other nutrient-dense green powders.",
    long_description: "<p>Never fall short on your vegetable intake again with our <strong>Daily Green Combo</strong>. This bundle combines the immense nutritional power of dark leafy greens like Spinach and Moringa. Rich in iron, calcium, chlorophyll, and plant protein, this combo is the easiest way to ensure you and your family get your daily greens in a highly concentrated, convenient form.</p>",
    bullet_points: ["Massive dose of daily essential greens", "Rich in iron, calcium, and chlorophyll", "Convenient way to boost vegetable intake", "Perfect for green smoothies and juices", "100% pure, shade-dried green powders"],
    badges: ["Super Greens", "Iron Rich", "Combo Pack", "Vegan"],
    specifications: {
      "Form": "Powder", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Daily Green Combo | Spinach & Moringa Superfood Bundle",
      "_seo_description": "Shop the Daily Green Combo. Get your daily dose of iron, calcium, and vitamins with our premium Spinach and Moringa powders.",
      "_seo_keywords": "daily greens combo, super greens bundle, spinach moringa powder, green smoothie mix, healthy greens, treasure flavours",
      "_tags": "combo pack, super greens, iron rich, daily nutrition",
      "_section_How to Use": "<p>Blend 1 tsp of the green powders into your daily smoothie, or knead into dough for nutritious, colorful rotis and pastas.</p>"
    },
    hsn_code: "07129090", gst_rate: 5
  },

  // HERBAL TEA
  "hibiscus-dry-flowers": {
    description: "Premium, whole dried Hibiscus flowers. Brews a vibrant, tart, ruby-red tea rich in Vitamin C and antioxidants.",
    long_description: "<p>Experience the tart, cranberry-like flavor of our <strong>Premium Dried Hibiscus Flowers</strong>. Sourced from organic farms and gently sun-dried, these whole flowers brew into a stunning ruby-red herbal tea. Naturally caffeine-free and packed with Vitamin C and antioxidants, Hibiscus tea is known to help lower blood pressure and support liver health. Enjoy it steaming hot or iced for a refreshing summer drink.</p>",
    bullet_points: ["Brews a stunning, vibrant ruby-red tea", "Naturally caffeine-free and rich in Vitamin C", "Known to support healthy blood pressure", "Deliciously tart, cranberry-like flavor", "Perfect for both hot tea and iced tea"],
    badges: ["Caffeine Free", "Antioxidants", "Heart Healthy", "100% Natural"],
    specifications: {
      "Form": "Whole Flowers", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Dried Hibiscus Flowers | Premium Herbal Tea",
      "_seo_description": "Buy premium whole Dried Hibiscus Flowers. Brew a delicious, ruby-red, caffeine-free herbal tea rich in Vitamin C and antioxidants.",
      "_seo_keywords": "hibiscus tea, dried hibiscus flowers, ruby red tea, herbal tea, caffeine free tea, treasure flavours",
      "_tags": "hibiscus tea, herbal tea, caffeine free, vitamin c",
      "_section_How to Use": "<p>Steep 3-4 dried flowers in hot water for 5 minutes. Add honey to taste. Serve hot, or chill and serve with ice and lemon.</p>"
    },
    hsn_code: "12119099", gst_rate: 5
  },
  "butterfly-pea-flower": {
    description: "Magical, color-changing Butterfly Pea Flowers. Brews a brilliant blue tea that turns purple with a squeeze of lemon!",
    long_description: "<p>Add a touch of magic to your teacup with our <strong>Dried Butterfly Pea Flowers</strong>. These mesmerizing flowers steep into a brilliant, deep sapphire blue tea. Rich in anthocyanin antioxidants, it promotes skin health, hair growth, and stress relief. The real magic happens when you add a few drops of lemon juice—watch the tea instantly transform from deep blue to vibrant purple!</p>",
    bullet_points: ["Magical color-changing properties (Blue to Purple)", "Rich in anthocyanin antioxidants", "Promotes healthy hair, skin, and vitality", "Earthy, mild flavor similar to green tea", "Naturally 100% caffeine-free"],
    badges: ["Color Changing", "Caffeine Free", "Antioxidants", "Stress Relief"],
    specifications: {
      "Form": "Whole Flowers", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Butterfly Pea Flowers | Magical Blue Herbal Tea",
      "_seo_description": "Shop premium Butterfly Pea Flowers. Brew a stunning blue herbal tea that changes to purple with lemon. Rich in antioxidants and caffeine-free.",
      "_seo_keywords": "butterfly pea flower, blue tea, color changing tea, aparajita flower, herbal tea, treasure flavours",
      "_tags": "blue tea, butterfly pea, color changing, herbal tea",
      "_section_How to Use": "<p>Steep 4-5 flowers in hot water until the water turns deep blue. Add honey and a squeeze of lemon to watch it turn purple!</p>"
    },
    hsn_code: "12119099", gst_rate: 5
  },
  "chamomile-dry-flower": {
    description: "Soothing, whole dried Chamomile flowers. A gentle, floral tea renowned for promoting relaxation and deep sleep.",
    long_description: "<p>Unwind after a long day with a warm cup of our <strong>Dried Chamomile Flowers</strong>. We source premium, whole chamomile blossoms that retain their essential oils and delicate, apple-like floral aroma. Long celebrated as a natural remedy for anxiety and insomnia, a cup of this caffeine-free tea before bed will gently lull you into a state of deep relaxation and restful sleep.</p>",
    bullet_points: ["Promotes deep relaxation and restful sleep", "Soothes anxiety and reduces stress", "Delicate, sweet, apple-like floral aroma", "Aids in soothing upset stomachs", "100% pure, whole chamomile blossoms"],
    badges: ["Sleep Aid", "Stress Relief", "Caffeine Free", "100% Pure"],
    specifications: {
      "Form": "Whole Flowers", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Dried Chamomile Flowers | Soothing Sleep Tea",
      "_seo_description": "Buy premium whole Dried Chamomile Flowers. The perfect caffeine-free herbal tea for stress relief, relaxation, and a good night's sleep.",
      "_seo_keywords": "chamomile tea, dried chamomile flowers, sleep tea, calming tea, herbal tea, treasure flavours",
      "_tags": "chamomile tea, sleep aid, calming, herbal tea",
      "_section_How to Use": "<p>Steep 1 tablespoon of flowers in hot (not boiling) water for 5-7 minutes. Strain, add a touch of honey, and enjoy 30 minutes before bed.</p>"
    },
    hsn_code: "12119099", gst_rate: 5
  },
  "rose-dry-flower": {
    description: "Fragrant, sun-dried Damask Rose petals. Brews a delicate, romantic tea that uplifts the mood and clears the skin.",
    long_description: "<p>Indulge your senses with our elegant <strong>Dried Rose Flowers (Petals)</strong>. Sourced from the finest Damask roses, these petals are gently dried to preserve their captivating fragrance and essential oils. Rose tea is highly valued in Ayurveda for its cooling properties, ability to uplift the mood, relieve stress, and promote a clear, glowing complexion from within.</p>",
    bullet_points: ["Captivating, delicate floral aroma and taste", "Natural mood lifter and stress reliever", "Ayurvedic cooling properties for the body", "Promotes clear, glowing skin", "100% pure Damask rose petals"],
    badges: ["Mood Lifter", "Skin Health", "Caffeine Free", "Aromatic"],
    specifications: {
      "Form": "Petals", "Diet Type": "Vegan", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Dried Rose Petals | Premium Rose Herbal Tea",
      "_seo_description": "Shop pure sun-dried Rose Petals. Brew a fragrant, cooling herbal tea that uplifts the mood and promotes glowing skin. 100% natural.",
      "_seo_keywords": "rose tea, dried rose petals, damask rose, herbal tea, glowing skin tea, treasure flavours",
      "_tags": "rose tea, rose petals, floral tea, skin health",
      "_section_How to Use": "<p>Steep a handful of petals in hot water for 5 minutes. Enjoy as a delicate tea, or use the cooled water as a natural facial toner.</p>"
    },
    hsn_code: "12119099", gst_rate: 5
  },

  // NATURAL FOODS
  "honey-gulkhand": {
    description: "A luxurious, cooling preserve made from fresh rose petals and raw honey. A natural digestive and summer coolant.",
    long_description: "<p>Indulge in the royal sweetness of our <strong>Honey Gulkhand</strong>. Unlike commercial varieties made with refined sugar, our Gulkhand is crafted using sun-cured Damask rose petals naturally preserved in pure, raw honey. This Ayurvedic delicacy acts as a powerful natural coolant for the body, aids digestion, reduces acidity, and leaves a lingering floral sweetness on your palate.</p>",
    bullet_points: ["Made with pure raw honey, zero refined sugar", "Sun-cured Damask rose petals", "Natural body coolant and digestive aid", "Helps relieve acidity and fatigue", "Rich, luxurious floral taste"],
    badges: ["Refined Sugar Free", "Ayurvedic Coolant", "100% Natural", "Premium Quality"],
    specifications: {
      "Form": "Preserve", "Diet Type": "Vegetarian", "Shelf Life": "12 Months", "Preservatives": "No Preservatives", "Country Of Origin": "India",
      "_seo_title": "Pure Honey Gulkhand | Rose Petal Preserve without Sugar",
      "_seo_description": "Buy authentic Honey Gulkhand online. Made with Damask rose petals and raw honey. A natural Ayurvedic coolant and digestive aid.",
      "_seo_keywords": "honey gulkhand, rose petal jam, sugar free gulkhand, ayurvedic coolant, natural gulkhand, treasure flavours",
      "_tags": "gulkhand, honey preserve, digestive aid, rose petals, natural coolant",
      "_section_How to Use": "<p>Have one spoonful daily after meals to aid digestion, or mix a spoonful into cold milk for a refreshing and healthy rose drink.</p>"
    },
    hsn_code: "20079990", gst_rate: 12
  }
};

async function enrichProducts() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  
  // 1. Fetch all products for Treasure Flavours
  const { data: products, error: fetchErr } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .select('id, slug, name')
    .eq('store_id', storeId);
    
  if (fetchErr) {
    console.error("Error fetching products:", fetchErr);
    return;
  }
  
  console.log(`Found ${products.length} products to enrich.`);
  
  let successCount = 0;

  for (const product of products) {
    const slug = product.slug;
    const richContent = productContent[slug];
    
    if (!richContent) {
      console.warn(`No rich content mapped for slug: ${slug}`);
      continue;
    }
    
    // Update the DB
    const { error: updateErr } = await supabaseAdmin
      .from(TABLES.PRODUCTS)
      .update({
        description: richContent.description,
        long_description: richContent.long_description,
        bullet_points: richContent.bullet_points,
        badges: richContent.badges,
        specifications: richContent.specifications,
        hsn_code: richContent.hsn_code,
        gst_rate: richContent.gst_rate
      })
      .eq('id', product.id);
      
    if (updateErr) {
      console.error(`Failed to update ${product.name}:`, updateErr);
    } else {
      console.log(`Successfully enriched: ${product.name}`);
      successCount++;
    }
  }
  
  console.log(`\nEnrichment complete! Successfully updated ${successCount}/${products.length} products.`);
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  enrichProducts().catch(console.error);
});
