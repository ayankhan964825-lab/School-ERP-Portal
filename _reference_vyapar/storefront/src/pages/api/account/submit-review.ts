import { verifyCustomerAuth, signCustomerAuth } from '../../../lib/auth';
import type { APIRoute } from 'astro';
import { saveReview, getOrdersByCustomerId, getCustomerById, hasUserReviewedProduct, supabase } from '../../../lib/database';
import { TABLES } from '../../../lib/constants';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const customerId = verifyCustomerAuth(cookies.get('customer_auth')?.value);
        if (!customerId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        
        const cust = await getCustomerById(customerId);
        if (!cust) {
          return new Response(JSON.stringify({ error: 'Unauthorized: Customer not found' }), { status: 401 });
        }
    
        const body = await request.json();
        const { product, productId, variant, customer, phone, rating, title, body: reviewBody } = body;
    
        if (!product || !rating) {
          return new Response(JSON.stringify({ error: 'Product and rating are required.' }), { status: 400 });
        }
    
        if (phone && phone !== cust.phone) {
          return new Response(JSON.stringify({ error: 'Phone number mismatch.' }), { status: 403 });
        }
    
        // Resolve the product slug
        let resolvedProduct;
        if (productId) {
          const { data } = await supabase.from(TABLES.PRODUCTS).select('id, slug, name').eq('id', productId).single();
          resolvedProduct = data;
        }
        if (!resolvedProduct) {
          const { data } = await supabase.from(TABLES.PRODUCTS).select('id, slug, name').eq('name', product).single();
          resolvedProduct = data;
        }
        
        if (!resolvedProduct) {
            return new Response(JSON.stringify({ error: 'Product not found or no longer available for review.' }), { status: 404 });
        }
        
        const product_slug = resolvedProduct.slug;
        
        // IDOR Fix: Verify purchase before allowing review
        const pastOrders = await getOrdersByCustomerId(customerId);
        let hasPurchased = false;
        let hasDelivered = false;
        for (const order of pastOrders) {
            if (order.status !== 'cancelled' && order.items && order.items.some((item: any) => 
                (resolvedProduct && item.product_id === resolvedProduct.id) || item.name === product
            )) {
                hasPurchased = true;
                if (order.status === 'delivered' || order.status === 'completed') {
                    hasDelivered = true;
                }
            }
        }
        
        if (!hasPurchased) {
            return new Response(JSON.stringify({ error: 'Forbidden: You can only review products you have purchased.' }), { status: 403 });
        }
        if (!hasDelivered) {
            return new Response(JSON.stringify({ error: 'Forbidden: You can only review products that have been delivered to you.' }), { status: 403 });
        }
        
        // Prevent duplicate reviews by the same user for the same product
        const alreadyReviewed = await hasUserReviewedProduct(product_slug, cust.phone);
          
        if (alreadyReviewed) {
            return new Response(JSON.stringify({ error: 'You have already reviewed this product.' }), { status: 403 });
        }

        let safeRating = parseInt(rating);
        if (isNaN(safeRating)) safeRating = 5;
        if (safeRating < 1) safeRating = 1;
        if (safeRating > 5) safeRating = 5;

        const authPhone = cust.phone;

        const newReviewData: any = {
          product_slug,
          customer_name: customer,
          phone: authPhone,
          rating: safeRating,
          title,
          comment: reviewBody,
        };

        const newReview = await saveReview(newReviewData);
    
        return new Response(JSON.stringify({ success: true, review: newReview }), { status: 200 });
      } catch (error) {
        console.error('Submit review API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
      }
  });
};
