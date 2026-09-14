import type { APIRoute } from 'astro';
import { getSettings } from '../../../lib/database';
import { storeContext } from '../../../lib/storeContext';

export const GET: APIRoute = async ({ locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const settings = await getSettings();
      return new Response(JSON.stringify({
        allow_coupon_stacking: settings.allow_coupon_stacking === 'true' || settings.allow_coupon_stacking === true,
        free_shipping_threshold: settings.free_shipping_threshold !== undefined ? Number(settings.free_shipping_threshold) : 499,
        flat_shipping_rate: settings.flat_shipping_rate !== undefined ? Number(settings.flat_shipping_rate) : 60,
        prepaid_discount_enabled: settings.prepaid_discount_enabled === 'true' || settings.prepaid_discount_enabled === true,
        prepaid_discount_type: settings.prepaid_discount_type || 'percentage',
        prepaid_discount_value: Number(settings.prepaid_discount_value || 0),
        prepaid_discount_min_order: Number(settings.prepaid_discount_min_order || 0),
        global_inventory_tracking: settings.global_inventory_tracking === true || settings.global_inventory_tracking === 'true',
        allow_flash_sale_stacking: settings.allow_flash_sale_stacking !== 'false' && settings.allow_flash_sale_stacking !== false,
      }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), { status: 500 });
    }
  });
};
