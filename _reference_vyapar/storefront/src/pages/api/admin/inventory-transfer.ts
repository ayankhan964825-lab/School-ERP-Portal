import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/database';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import { storeContext } from '../../../lib/storeContext';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, "inventory")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    try {
      const { variant_id, from_location_id, to_location_id, quantity } = await request.json();
      
      if (!variant_id || !from_location_id || !to_location_id || !quantity || quantity <= 0) {
        return new Response(JSON.stringify({ error: "Invalid transfer parameters" }), { status: 400 });
      }

      if (!supabaseAdmin) {
        return new Response(JSON.stringify({ error: "Supabase not configured" }), { status: 500 });
      }

      // Verify locations belong to the authenticated store to prevent cross-tenant transfers
      const { data: locations } = await supabaseAdmin.from('locations').select('id, store_id').in('id', [from_location_id, to_location_id]);
      if (!locations || locations.length !== 2 || locations.some(l => l.store_id !== locals.storeId)) {
          return new Response(JSON.stringify({ error: "Invalid locations or unauthorized transfer attempt" }), { status: 403 });
      }

      // We need to deduct from `from_location_id` and add to `to_location_id`.
      // Doing this via RPC would be safest, but we can do it via a quick select/update 
      // since it's an admin operation.

      // 1. Check from_location stock
      const { data: fromStock, error: fromError } = await supabaseAdmin
        .from('inventory_levels')
        .select('id, available')
        .eq('variant_id', variant_id)
        .eq('location_id', from_location_id)
        .single();
        
      if (fromError || !fromStock) {
        return new Response(JSON.stringify({ error: "Source location does not have this item or sufficient stock." }), { status: 400 });
      }

      if (fromStock.available < quantity) {
        return new Response(JSON.stringify({ error: `Not enough stock in source. Available: ${fromStock.available}` }), { status: 400 });
      }

      // 2. Deduct from source
      await supabaseAdmin
        .from('inventory_levels')
        .update({ available: fromStock.available - quantity })
        .eq('id', fromStock.id);

      // 3. Add to destination
      // We must use upsert in case destination doesn't have this item yet.
      const { data: toStock } = await supabaseAdmin
        .from('inventory_levels')
        .select('id, available')
        .eq('variant_id', variant_id)
        .eq('location_id', to_location_id)
        .single();

      if (toStock) {
        await supabaseAdmin
          .from('inventory_levels')
          .update({ available: toStock.available + quantity })
          .eq('id', toStock.id);
      } else {
        await supabaseAdmin
          .from('inventory_levels')
          .insert({
            store_id: locals.storeId,
            location_id: to_location_id,
            variant_id: variant_id,
            available: quantity,
            committed: 0
          });
      }

      // 4. Log transactions
      const txPayload = [
        {
          store_id: locals.storeId,
          location_id: from_location_id,
          variant_id: variant_id,
          quantity_change: -quantity,
          transaction_type: 'transfer_out',
          notes: `Transfer to ${to_location_id}`
        },
        {
          store_id: locals.storeId,
          location_id: to_location_id,
          variant_id: variant_id,
          quantity_change: quantity,
          transaction_type: 'transfer_in',
          notes: `Transfer from ${from_location_id}`
        }
      ];

      await supabaseAdmin.from('inventory_transactions').insert(txPayload);

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
      console.error('Inventory Transfer Error:', err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  });
};
