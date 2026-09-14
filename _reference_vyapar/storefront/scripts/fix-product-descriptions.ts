import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

const updates = [
  {
    id: 'eacf24fc-a082-4299-9667-d8ad52a0cca3', // Amla Powder
    data: {
      long_description: "Experience the rejuvenating power of our pure Amla (Indian Gooseberry) Powder. Revered in Ayurveda as a potent rasayana, Amla is one of the richest natural sources of Vitamin C. It deeply nourishes the hair, promotes a glowing complexion, and significantly boosts immunity and digestion. Our Amla powder is carefully shade-dried and finely milled to retain maximum nutritional value.",
      bullet_points: [
        "100% pure, shade-dried Amla powder",
        "Exceptionally high natural Vitamin C content",
        "Promotes healthy hair growth and glowing skin",
        "Boosts immunity and aids in healthy digestion",
        "Versatile for both consumption and DIY beauty masks"
      ]
    }
  },
  {
    id: '7d549cb4-c1fc-48a7-bd69-62156977c786', // Hibiscus Dry FLowers
    data: {
      description: "Whole, sun-dried Hibiscus flowers for a tart, ruby-red herbal infusion. Packed with Vitamin C and naturally caffeine-free.",
      long_description: "Enjoy the vibrant taste and health benefits of our premium sun-dried Hibiscus Flowers. Known for their distinctively tart, cranberry-like flavor and deep ruby-red color, these flowers make a refreshing hot or iced tea. Hibiscus is naturally rich in Vitamin C, antioxidants, and is traditionally used to support healthy blood pressure and digestion.",
      bullet_points: [
        "Premium whole sun-dried flowers",
        "Brews a refreshing, ruby-red herbal tea",
        "Exceptionally rich in Vitamin C and antioxidants",
        "Supports healthy blood pressure and digestion",
        "100% pure, natural, and caffeine-free"
      ]
    }
  },
  {
    id: 'bb46fa19-fda8-4581-ae1a-fcfd0ab786df', // Butterfly Pea Flower
    data: {
      description: "Premium sun-dried Butterfly Pea Flowers, perfect for brewing vibrant blue tea. Rich in antioxidants and naturally caffeine-free.",
      long_description: "Discover the magic of our 100% natural Butterfly Pea Flowers. Sourced directly from sustainable farms, these delicate blossoms create a stunning, color-changing blue herbal tea. Known in Ayurveda for their calming properties and high antioxidant content, they promote healthy skin, hair, and overall vitality. Add a few drops of lemon juice to watch the tea magically turn from deep blue to vibrant purple!",
      bullet_points: [
        "100% natural and sun-dried",
        "Brews a stunning, color-changing blue tea",
        "Rich in antioxidants and anthocyanins",
        "Naturally caffeine-free and calming",
        "Perfect for hot tea, iced beverages, and culinary garnishes"
      ]
    }
  },
  {
    id: '094cbf42-aed6-4cb3-a29b-663bd31be84e', // Daily Green Combo
    data: {
      long_description: "Boost your daily nutrition effortlessly with our Daily Green Combo. This curated pack combines the power of nature's best greens, specially formulated to provide a concentrated dose of essential vitamins, minerals, and dietary fiber. Perfect for adding a nutritional punch to your morning smoothies, juices, or daily meals.",
      bullet_points: [
        "Curated selection of essential green superfoods",
        "Convenient 100g packs for daily use",
        "Rich in natural vitamins, minerals, and fiber",
        "Effortlessly blends into smoothies and juices",
        "100% natural and preservative-free"
      ]
    }
  },
  {
    id: 'dd8ee8ba-b355-4db8-be72-b3f311c5fe4b', // Natural Detox Combo
    data: {
      long_description: "Cleanse and revitalize your body with the Natural Detox Combo. This powerful blend of superfoods is designed to support your body's natural detoxification processes, aid digestion, and boost your metabolism. Incorporate this combo into your daily routine to feel lighter, more energetic, and rejuvenated from within.",
      bullet_points: [
        "Specially formulated for natural body detoxification",
        "Supports healthy digestion and metabolism",
        "Helps flush out toxins and promotes glowing skin",
        "Easy to incorporate into detox drinks or warm water",
        "Pure, unadulterated ingredients"
      ]
    }
  },
  {
    id: '9a4d73ff-a2e3-4e36-93a7-d8ea8433df87', // Immunity Booster Combo
    data: {
      long_description: "Fortify your body's natural defenses with our Immunity Booster Combo. Carefully assembled with potent, traditional ingredients known for their immune-boosting properties. This combo provides a rich source of antioxidants and essential nutrients to help you stay strong and healthy year-round.",
      bullet_points: [
        "Powerful blend of immune-boosting superfoods",
        "Rich in antioxidants and natural Vitamin C",
        "Supports a strong and healthy immune system",
        "Ideal for daily consumption during seasonal changes",
        "100% natural, safe, and effective"
      ]
    }
  }
];

async function fixProductDescriptions() {
  console.log("Starting strictly targeted product updates...");
  
  for (const item of updates) {
    const { error } = await supabaseAdmin
      .from(TABLES.PRODUCTS)
      .update(item.data)
      .eq('id', item.id);
      
    if (error) {
      console.error(`Error updating product ID ${item.id}:`, error);
    } else {
      console.log(`Successfully updated product ID: ${item.id}`);
    }
  }
  
  console.log("All targeted updates completed successfully.");
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  fixProductDescriptions().catch(console.error);
});
