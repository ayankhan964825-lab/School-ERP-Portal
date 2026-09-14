import { TABLES } from '../../../lib/constants';
import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabase } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'customers')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        
        if (!Array.isArray(body)) {
          return new Response(JSON.stringify({ error: 'Payload must be an array of customers' }), { status: 400 });
        }
    
        if (isSupabase && supabaseAdmin) {
          // Validate customer array
          const validCustomers = body.filter(c => c.phone || c.email);
          
          if (validCustomers.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid customers found in payload. Phone or email is required.' }), { status: 400 });
          }
    
          // Upsert customers based on phone number or email (Supabase ideally should have a unique constraint on phone)
          const customersToUpsert = validCustomers.map((c, index) => {
            return {
              id: c.id || 'CUST-BULK-' + Date.now() + '-' + index,
              store_id: ctx.storeId,
              name: c.name || 'Unknown',
              phone: c.phone || '',
              email: c.email || '',
              address: c.address || c.street_address || '',
              city: c.city || '',
              state: c.state || '',
              pincode: c.pincode || '',
              total_orders: c.total_orders || 0,
              updated_at: new Date().toISOString()
            };
          });
    
          // In Supabase, if there is a unique constraint on phone, we can use onConflict.
          // Assuming phone is unique for customers, else we just insert
          const { data, error } = await supabaseAdmin.from(TABLES.CUSTOMERS)
            .upsert(customersToUpsert, { onConflict: 'phone, store_id', ignoreDuplicates: false })
            .select();
    
          if (error) {
            console.error('Supabase Bulk Customers Insert Error:', error);
            
            // If upsert fails because of missing unique constraint, fallback to insert
            if (error.code === '42P10') {
               console.log('Falling back to insert due to missing unique constraint on phone');
               const { data: insertData, error: insertError } = await supabaseAdmin.from(TABLES.CUSTOMERS).insert(customersToUpsert).select();
               if (insertError) {
                 return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
               }
               return new Response(JSON.stringify({ success: true, count: insertData.length }), { status: 200 });
            }
            
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
          }
    
          return new Response(JSON.stringify({ success: true, count: data.length }), { status: 200 });
        } else {
          // Mock mode
          return new Response(JSON.stringify({ success: true, count: body.length }), { status: 200 });
        }
      } catch (error) {
        console.error('Bulk upload customers error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
  });
};
