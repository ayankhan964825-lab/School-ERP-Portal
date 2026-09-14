import { config } from 'dotenv';
config();
import { rawSupabaseAdmin } from './src/lib/database.ts';

async function run() {
  const { data: prods } = await rawSupabaseAdmin.from('products').select('*').ilike('name', '%Anniversary Photo Cake%');
  for (const p of prods || []) {
    console.log(`Product: ${p.name} (ID: ${p.id})`);
    console.log('  variant_options:', JSON.stringify(p.variant_options));
    console.log('  variants (JSONB):', JSON.stringify(p.variants));
    
    // Check product_variants table
    const { data: v } = await rawSupabaseAdmin.from('product_variants').select('*').eq('product_id', p.id);
    console.log(`  product_variants rows: ${v?.length || 0}`);
    if (v && v.length > 0) {
      console.log('  Rows:', JSON.stringify(v.map(variant => ({ id: variant.id, name: variant.name, weight: variant.weight })), null, 2));
    }
  }
}
run();
