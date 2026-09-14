import type { APIRoute } from 'astro';
import { verifyCustomerAuth } from '../../../lib/auth';
import { getCustomerById, getOrdersByCustomerId, hasUserReviewedProduct, getProductBySlug } from '../../../lib/database';
import { storeContext } from '../../../lib/storeContext';

export const GET: APIRoute = async ({ request, locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
      const url = new URL(request.url);
      const slug = url.searchParams.get('slug');
      
      if (!slug) {
        return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });
      }

      // Check auth
      const cookieStr = request.headers.get('cookie') || '';
      const tokenMatch = cookieStr.match(new RegExp('(^| )customer_auth=([^;]+)'));
      const customerToken = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null;
      const customerId = verifyCustomerAuth(customerToken);

      if (!customerId) {
        return new Response(JSON.stringify({ loggedIn: false, canWriteReview: false, alreadyReviewed: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      const cust = await getCustomerById(customerId);
      if (!cust) {
        return new Response(JSON.stringify({ loggedIn: false, canWriteReview: false, alreadyReviewed: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      const productRaw = await getProductBySlug(slug, locals.storeId);
      if (!productRaw) {
        return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 });
      }

      let canWriteReview = false;
      const pastOrders = await getOrdersByCustomerId(customerId);
      
      for (const order of pastOrders) {
        if ((order.status === 'delivered' || order.status === 'completed') &&
            order.items?.some((item: any) =>
              item.product_id === productRaw.id ||
              item.name?.toLowerCase() === productRaw.name?.toLowerCase() ||
              (item.product_slug && item.product_slug === slug)
            )) {
          canWriteReview = true;
          break;
        }
      }

      let alreadyReviewed = false;
      if (canWriteReview) {
        alreadyReviewed = await hasUserReviewedProduct(slug, cust.phone);
      }

      return new Response(JSON.stringify({ 
        loggedIn: true, 
        canWriteReview, 
        alreadyReviewed 
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });

    } catch (error) {
      console.error('Review eligibility error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
  });
};
