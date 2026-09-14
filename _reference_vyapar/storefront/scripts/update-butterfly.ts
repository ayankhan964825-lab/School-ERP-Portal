import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateProducts() {
  const { error } = await supabase
    .from('products')
    .update({
      description: "Premium sun-dried Butterfly Pea Flowers for a mesmerizing color-changing blue herbal tea. Packed with antioxidants and naturally caffeine-free.",
      long_description: "Experience the magic of our premium sun-dried Butterfly Pea Flowers. Revered in traditional medicine and modern mixology, these vibrant blue flowers create a stunning, naturally caffeine-free herbal infusion. When brewed, the tea boasts a brilliant sapphire hue that dramatically transforms into a deep magenta with a simple squeeze of lemon or citrus. Beyond its mesmerizing color, Butterfly Pea Flower tea is celebrated for its high antioxidant content, subtle earthy flavor, and its ability to promote relaxation and healthy skin.",
      bullet_points: [
        "100% natural, premium sun-dried whole flowers",
        "Brews a stunning, color-changing blue herbal tea",
        "Naturally caffeine-free and rich in antioxidants",
        "Subtle, earthy flavor perfect for teas, mocktails, and cocktails",
        "Traditionally used to promote relaxation and healthy skin"
      ]
    })
    .eq('id', 'bb46fa19-fda8-4581-ae1a-fcfd0ab786df');

  if (error) {
    console.error("Error updating product:", error);
    return;
  }
  
  console.log("Successfully updated Butterfly Pea Flower!");
}

updateProducts();
