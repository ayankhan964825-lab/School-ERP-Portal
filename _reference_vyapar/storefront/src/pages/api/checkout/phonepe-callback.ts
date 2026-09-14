import { TABLES } from '../../../lib/constants';
import type { APIRoute } from 'astro';
import { verifyPhonePeCallback } from '../../../lib/phonepe';
import { getOrders, saveOrder, updateOrderStatus } from '../../../lib/database';
import { sendNotifications } from '../../../lib/notifications';
import { runAutoAssign } from '../../../lib/autoAssign';
import { storeContext } from '../../../lib/storeContext';

export const ALL: APIRoute = async ({ request, redirect }) => {
  try {
    const url = new URL(request.url);
    const isMock = url.searchParams.get('mock') === 'true';
    const queryOrderId = url.searchParams.get('orderId');

    let transactionId = '';

    if (isMock) {
      transactionId = queryOrderId || '';
    } else {
      // In real mode, PhonePe v1 posts base64 encoded data in 'response' field
      if (request.method === 'POST') {
        const formData = await request.formData().catch(() => null);
        if (formData) {
          const response = formData.get('response') as string;
          if (response) {
            try {
              const decoded = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));
              transactionId = decoded.data?.merchantTransactionId || '';
            } catch (e) {}
          }
        }
      }
      
      // Fallback for PG v2 where it might be a GET redirect or missing response body
      if (!transactionId && queryOrderId) {
        transactionId = queryOrderId;
      }
    }

    if (!transactionId) {
      return redirect('/checkout?error=Payment+Failed');
    }

    // Find the order in the database to resolve store_id first
    const { supabaseAdmin, isSupabase } = await import('../../../lib/database');
    const { storeContext } = await import('../../../lib/storeContext');
    
    let orderIdFromDb = null;
    let orderEntityId = null;
    let storeId = null;
    let allItems: any[] = [];
    let masterOrderInfo: any = null;

    if (isSupabase && supabaseAdmin) {
      const { data: masterOrderData } = await supabaseAdmin.from(TABLES.MASTER_ORDERS)
        .select('id, display_id, customer_name, customer_phone, customer_email, total_amount, shipping_address')
        .eq('display_id', transactionId)
        .single();
        
      if (masterOrderData) {
          orderIdFromDb = masterOrderData.display_id;
          orderEntityId = masterOrderData.id;
          masterOrderInfo = masterOrderData;
          
          // Try to get sub-orders for notification purposes (store context and items)
          const { data: subOrders } = await supabaseAdmin.from(TABLES.ORDERS)
            .select('store_id, payment_status, items')
            .eq('master_order_id', masterOrderData.id);
            
          if (subOrders && subOrders.length > 0) {
            const firstSubOrder = subOrders[0];
            storeId = firstSubOrder.store_id;
            allItems = subOrders.flatMap((sub: any) => sub.items || []);
            
            // TASK 1 FIX: Idempotency check to prevent double deduction
            if (firstSubOrder.payment_status === 'paid') {
              console.log('[PhonePe Webhook] Order already paid. Ignoring duplicate webhook.');
              return redirect('/order-success?id=' + transactionId);
            }
          }
      }
    } else {
      const { getOrders } = await import('../../../lib/database');
      const orders = await getOrders();
      const mockOrder = orders.find((o: any) => o.orderId === transactionId);
      if (mockOrder) {
          orderIdFromDb = mockOrder.orderId;
          orderEntityId = mockOrder.id;
      }
    }

    if (!orderIdFromDb) {
      return redirect('/checkout?error=Order+Not+Found');
    }

    // Verify status securely within the tenant's context
    const verification = storeId 
       ? await storeContext.run({ storeId }, async () => verifyPhonePeCallback(transactionId))
       : await verifyPhonePeCallback(transactionId);

    if (verification.success) {
        // SECURITY FIX: Cross-check the paid amount with the backend amount to prevent price manipulation
        if (masterOrderInfo && verification.data?.data?.amount) {
          const paidAmountPaise = verification.data.data.amount;
          const expectedPaise = Math.round(masterOrderInfo.total_amount * 100);
          if (Math.abs(paidAmountPaise - expectedPaise) > 100) { // Allow ₹1 tolerance
            console.error(`[PhonePe Webhook] AMOUNT MISMATCH! PhonePe: ${paidAmountPaise} paise, Expected: ${expectedPaise} paise`);
            return redirect('/checkout?error=Payment+Amount+Mismatch');
          }
        }
        
        // Update order status to paid
        if (orderEntityId) {
          // It's in Supabase, we can use updateOrderStatus
          // Wait, updateOrderStatus only updates `status`. We also need to update `paymentStatus`.
          // For now, let's just save a new copy if mockDb, or write a custom query for Supabase if needed.
          // Since saveOrder acts as an upsert (in some implementations) or we can just update via admin client.
          const { supabaseAdmin, isSupabase, getSettings } = await import('../../../lib/database');
          if (isSupabase && supabaseAdmin) {
            const settings = await getSettings();
            const isTrackingOff = (settings.global_inventory_tracking !== true && settings.global_inventory_tracking !== 'true');
            
            const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('atomic_confirm_payment', {
                p_lookup_id: transactionId,
                p_razorpay_payment_id: verification.data?.data?.transactionId || 'mock',
                p_skip_deduction: isTrackingOff,
                p_store_id: storeId
            });

            if (rpcErr) {
                console.error('[PhonePe Callback RPC Error]', rpcErr);
            } else if (rpcData && rpcData.already_paid) {
                console.log(`[PhonePe Webhook] Order ${transactionId} already paid. Ignoring duplicate call.`);
            }
          } else {
             // MockDB doesn't have an update method for full order, it just pushes. 
             // That's fine for mock mode.
          }
        }
        
        // Send notification securely within tenant context
        const notificationPayload = {
          type: 'new_order',
          orderId: orderIdFromDb,
          customerName: masterOrderInfo?.customer_name || 'Customer',
          customerPhone: masterOrderInfo?.customer_phone || '',
          customerEmail: masterOrderInfo?.customer_email || '',
          amount: masterOrderInfo?.total_amount || 0,
          paymentMethod: 'PhonePe',
          address: masterOrderInfo?.shipping_address || null,
          items: allItems
        };

        if (storeId) {
            await storeContext.run({ storeId }, async () => {
                await sendNotifications(notificationPayload as any).catch(err => console.error('Notification error:', err));
            });
        } else {
            await sendNotifications(notificationPayload as any).catch(err => console.error('Notification error:', err));
        }
        
        // INSTANT QC AUTO-ASSIGN: Trigger rider assignment instantly
        await runAutoAssign().catch(err => console.error('Instant Auto-assign error:', err));
        
        return redirect('/order-success?id=' + transactionId);
    } else {
        return redirect('/checkout?error=Payment+Verification+Failed');
    }

  } catch (error) {
    console.error('PhonePe callback error:', error);
    return redirect('/checkout?error=Server+Error');
  }
};
