import type { APIRoute } from 'astro';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { updateProductB2BVariants } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";
import { z } from 'zod';

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  weight: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  originalPrice: z.coerce.number().min(0).optional(),
  original_price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  sku: z.string().optional(),
  is_out_of_stock: z.boolean().optional(),
  is_hidden: z.boolean().optional()
}).passthrough();

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, "products")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }
    try {
        const body = await request.json();
        const { productId, b2b_variants } = body;
    
        if (!productId || !Array.isArray(b2b_variants)) {
          return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
        }
        
        const validatedVariants = z.array(variantSchema).parse(b2b_variants);
    
        await updateProductB2BVariants(productId, validatedVariants);
    
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error("Update B2B variants error:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to update variants" }), { status: 500 });
      }
  });
};
