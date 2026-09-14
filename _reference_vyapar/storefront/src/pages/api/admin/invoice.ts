import { getPermissionContext, canManageSection } from '../../../lib/permissions';
﻿import type { APIRoute } from 'astro';
import { getOrders } from '../../../lib/database';

function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const GET: APIRoute = async ({ url , cookies }) => {
  const ctx = getPermissionContext(cookies);
  if (!canManageSection(ctx, 'orders')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  const orderId = url.searchParams.get('id');
  if (!orderId) {
    return new Response('Missing order ID', { status: 400 });
  }

  const orders = await getOrders();
  const order = orders.find((o: any) => o.orderId === orderId);
  if (!order) {
    return new Response('Order not found', { status: 404 });
  }

  const fulfillmentId = url.searchParams.get('fulfillmentId');
  let items = order.items || [];
  let invoiceTitle = `Invoice #${order.orderId}`;
  
  if (fulfillmentId && order.fulfillments) {
    const fulfillment = order.fulfillments.find((f: any) => f.id === fulfillmentId);
    if (fulfillment && fulfillment.items) {
      items = fulfillment.items;
      invoiceTitle = `Invoice #${order.orderId}-${fulfillmentId.substring(0,6)}`;
    }
  }

  // Generate a simple HTML invoice that can be printed as PDF via browser
  const itemRows = items.map((item: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.name)} (${escapeHtml(item.weight)})</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.price}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.price * item.quantity}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${invoiceTitle}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .brand { font-size: 24px; font-weight: 700; color: #2D5A27; }
    .invoice-title { font-size: 28px; color: #666; text-align: right; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-box h3 { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 0.5px; }
    .info-box p { margin: 2px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f9f9f9; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
    .totals { text-align: right; margin-top: 20px; }
    .totals .row { display: flex; justify-content: flex-end; gap: 40px; padding: 4px 0; font-size: 14px; }
    .totals .total { font-size: 18px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 8px; margin-top: 8px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:20px">
    <button onclick="window.print()" style="padding:10px 24px;background:#2D5A27;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600">Download PDF</button>
  </div>

  <div class="header">
    <div class="brand">Store Name</div>
    <div class="invoice-title">${escapeHtml(invoiceTitle)}</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Bill To</h3>
      <p><strong>${escapeHtml(order.customer?.name || 'Customer')}</strong></p>
      <p>${escapeHtml(order.customer?.address || '')}</p>
      <p>${escapeHtml(order.customer?.city || '')}, ${escapeHtml(order.customer?.state || '')} - ${escapeHtml(order.customer?.pincode || '')}</p>
      <p>Phone: ${escapeHtml(order.customer?.phone || '')}</p>
    </div>
    <div class="info-box" style="text-align:right">
      <h3>Invoice Details</h3>
      <p><strong>Invoice #:</strong> ${escapeHtml(order.orderId)}</p>
      <p><strong>Date:</strong> ${escapeHtml(new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
      <p><strong>Payment:</strong> ${escapeHtml((order.paymentMethod || 'cod').toUpperCase())}</p>
      <p><strong>Status:</strong> ${escapeHtml((order.paymentStatus || 'pending').toUpperCase())}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Price</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal:</span><span>₹${items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)}</span></div>
    <div class="row"><span>Shipping:</span><span>FREE</span></div>
    <div class="row total"><span>Total:</span><span>₹${items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)}</span></div>
  </div>

  <div class="footer">
    <p>Store Name â€” Premium Quality Products</p>
    <p>Thank you for your order!</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
};
