import type { APIRoute } from 'astro';
import { getProducts, getSettings, supabaseAdmin, isSupabase } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import { getEligibleLocations } from "../../../lib/orderRouter";

export const POST: APIRoute = async ({ request , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const body = await request.json();
        const cartItemIds: string[] = body.itemIds || [];
        const pincode: string | null = body.pincode || null;
    
        const settings = await getSettings();
        const globalTracking = settings.global_inventory_tracking === true || settings.global_inventory_tracking === 'true';
    
        if (cartItemIds.length === 0) {
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
    
        const products = await getProducts();
        
        // 1. Resolve actual variants for each cart item first
        const resolvedVariantIds: string[] = [];
        const cartItemMap: Record<string, any> = {};

        for (const cartId of cartItemIds) {
          const uuidMatch = cartId.match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
          const prodMatch = cartId.match(/^(PROD-\d+)/);
          const productId = uuidMatch ? uuidMatch[1] : (prodMatch ? prodMatch[1] : cartId.split('-')[0]);
          const variantId = uuidMatch ? cartId.substring(productId.length + 1) : (prodMatch ? cartId.substring(productId.length + 1) : cartId.split('-').slice(1).join('-'));
          const product = products.find((p: any) => p.id === productId);
          if (!product) continue;
    
          let variant = product.variants?.find((v: any) => v.id === variantId);
          if (!variant && (!variantId || variantId === '') && product.variants && product.variants.length > 0) {
             variant = product.variants[0];
          }
          cartItemMap[cartId] = { product, variant, parsedVariantId: variantId };
          if (variant) {
             resolvedVariantIds.push(variant.id);
          }
        }
    
        let inventoryData: any[] = [];
        let aggregatedStock: Record<string, number> = {};
        let eligibleLocationIds: string[] = [];

        if (globalTracking && isSupabase) {
            // 2. Get Eligible Locations for the user's pincode
            const eligibleLocations = await getEligibleLocations(locals.storeId, pincode);
            eligibleLocationIds = eligibleLocations.map((l: any) => l.id);

            // 3. Fetch specific inventory levels for these resolved variant IDs
            if (eligibleLocationIds.length > 0 && resolvedVariantIds.length > 0) {
                const { data } = await supabaseAdmin.from('inventory_levels')
                    .select('variant_id, available, location_id')
                    .in('location_id', eligibleLocationIds)
                    .in('variant_id', resolvedVariantIds);
                inventoryData = data || [];
            }

            // Aggregate stock across eligible locations
            inventoryData.forEach(level => {
                 aggregatedStock[level.variant_id] = (aggregatedStock[level.variant_id] || 0) + level.available;
            });
        }
    
        // 4. Build the final stock map
        const stockMap: Record<string, { stock: number; trackInventory: boolean; is_qc_only?: boolean; isFlashSale?: boolean }> = {};
    
        for (const cartId of cartItemIds) {
          const mapped = cartItemMap[cartId];
          if (!mapped) continue;
          
          const { product, variant } = mapped;
          const flashVariant = variant && variant.isFlashSale ? variant : (product.isFlashSale ? product : null);
          
          if (variant && product.track_inventory) {
            let actualStock = variant.stock || 0;
            
            if (globalTracking && isSupabase) {
               actualStock = eligibleLocationIds.length > 0 ? (aggregatedStock[variant.id] || 0) : 0;
            }

            stockMap[cartId] = {
              stock: actualStock,
              trackInventory: true,
              is_qc_only: product.is_q_commerce_only || false,
              isFlashSale: !!flashVariant
            };
          } else {
             stockMap[cartId] = {
               stock: 999999,
               trackInventory: false,
               is_qc_only: product.is_q_commerce_only || false,
               isFlashSale: !!flashVariant
             };
          }
        }
    
        return new Response(JSON.stringify(stockMap), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Cart stock error:', error);
        return new Response(JSON.stringify({}), { status: 500 });
      }
  });
};
