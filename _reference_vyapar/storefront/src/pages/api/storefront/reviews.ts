import type { APIRoute } from 'astro';
import { saveReview } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

// Simple in-memory rate limiting (IP -> [timestamps])
// Note: In serverless environments, this resets per cold start, but blocks rapid script loops.
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REVIEWS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REVIEWS_PER_WINDOW) {
    rateLimitMap.set(ip, validTimestamps);
    return true;
  }
  
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

export const POST: APIRoute = async ({ request, clientAddress , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        // 1. Rate Limiting Check
        const ip = request.headers.get('x-forwarded-for') || clientAddress || 'unknown';
        if (isRateLimited(ip)) {
          return new Response(JSON.stringify({ success: false, error: 'Too many reviews submitted. Please try again later.' }), { status: 429 });
        }
    
        const data = await request.json();
        const { product_slug, rating, customer_name, title, comment } = data;
    
        // 2. Presence Validation
        if (!product_slug || !rating || !customer_name || !comment) {
          return new Response(JSON.stringify({ success: false, error: 'All fields are required.' }), { status: 400 });
        }
    
        // 3. Length Validations (Prevent DoS & DB bloat)
        if (String(customer_name).length > 100) return new Response(JSON.stringify({ success: false, error: 'Name is too long (max 100 characters).' }), { status: 400 });
        if (title && String(title).length > 150) return new Response(JSON.stringify({ success: false, error: 'Title is too long (max 150 characters).' }), { status: 400 });
        if (String(comment).length > 1000) return new Response(JSON.stringify({ success: false, error: 'Review comment is too long (max 1000 characters).' }), { status: 400 });
    
        // 4. Type & Value Validation
        const parsedRating = Math.floor(Number(rating));
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid rating.' }), { status: 400 });
        }
    
        // Insert the review. By default, it will be pending unless we explicitly set it to approved.
        const newReview = await saveReview({
          product_slug: String(product_slug).trim(),
          customer_name: String(customer_name).trim(),
          rating: parsedRating,
          title: title ? String(title).trim() : '',
          comment: String(comment).trim(),
          status: 'pending' // Admin must approve it before it shows on the site
        });
    
        if (newReview) {
          return new Response(JSON.stringify({ success: true, data: newReview }), { status: 200 });
        } else {
          return new Response(JSON.stringify({ success: false, error: 'Failed to save review to database.' }), { status: 500 });
        }
    
      } catch (error: any) {
        console.error('Error submitting review:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
  });
};
