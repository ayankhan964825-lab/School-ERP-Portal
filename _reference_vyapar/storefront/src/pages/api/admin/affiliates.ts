import type { APIRoute } from 'astro';
import { getAffiliates, updateAffiliate, deleteAffiliate, savePayout, getOrders, getSettings } from '../../../lib/database';
import { getPermissionContext, canManageSection, canViewSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const ctx = getPermissionContext(cookies);
    if (!canViewSection(ctx, 'affiliates')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });

    const affiliates = await getAffiliates();
    return new Response(JSON.stringify(affiliates), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const ctx = getPermissionContext(cookies);
        if (!canManageSection(ctx, 'affiliates') && ctx.adminRole !== 'super_admin' && ctx.adminRole !== 'admin') {
          return new Response(JSON.stringify({ error: `Unauthorized. Role: ${ctx.adminRole}` }), { status: 403 });
        }
    
        const data = await request.json();
        if (!data.id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });
    
        if (data.action === 'approve') {
          const updated = await updateAffiliate(data.id, { is_approved: true, status: 'active' });
          return new Response(JSON.stringify(updated), { status: 200 });
        }
    
        if (data.action === 'mark_paid') {
          const affiliates = await getAffiliates();
          const aff = affiliates.find((a: any) => a.id === data.id);
          if (!aff) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
          
          const orders = await getOrders();
          const settings = await getSettings();
          const payoutDays = settings?.payoutDays || 30;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - payoutDays);
    
          let earned = 0;
          let pending = 0;
          const myOrders = orders.filter((o: any) => o.affiliate_id === data.id && !['cancelled', 'returned', 'rto'].includes(o.status));
          myOrders.forEach((o: any) => {
            const orderDate = new Date(o.createdAt);
            const commission = o.affiliate_commission || 0;
            if (o.status === 'delivered' && orderDate <= cutoffDate) {
              earned += commission;
            } else {
              pending += commission;
            }
          });
    
          const paid = aff.paid_earnings || 0;
          const available = Math.max(0, earned - paid);
    
          const amountToPay = Number(data.amount);
          if (amountToPay <= 0) {
            return new Response(JSON.stringify({ error: 'Amount must be greater than 0' }), { status: 400 });
          }
          if (amountToPay > available) {
            return new Response(JSON.stringify({ error: 'Amount exceeds available balance' }), { status: 400 });
          }
    
          const newPaid = paid + amountToPay;
          const updated = await updateAffiliate(data.id, { paid_earnings: newPaid });
          
          await savePayout({
            affiliate_id: data.id,
            amount: Number(data.amount),
            transaction_id: data.transaction_id || 'MANUAL'
          });
          
          return new Response(JSON.stringify(updated), { status: 200 });
        }
    
        const updated = await updateAffiliate(data.id, data);
        return new Response(JSON.stringify(updated), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
  });
};

export const DELETE: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const ctx = getPermissionContext(cookies);
        if (!canManageSection(ctx, 'affiliates') && ctx.adminRole !== 'super_admin' && ctx.adminRole !== 'admin') {
          return new Response(JSON.stringify({ error: `Unauthorized. Role: ${ctx.adminRole}` }), { status: 403 });
        }
    
        const data = await request.json();
        if (!data.id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });
    
        // Soft-deactivate instead of hard delete to preserve payout/financial history
        await updateAffiliate(data.id, { is_approved: false, status: 'banned' });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
  });
};
