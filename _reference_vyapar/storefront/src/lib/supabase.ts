import { TABLES } from './constants';
﻿/**
 * Supabase Client â€” Database abstraction layer
 * 
 * This file provides a Supabase client that can be used across the app.
 * Currently, the app uses local JSON files via database.ts.
 * 
 * When you're ready to switch to Supabase:
 * 1. Set the following in Admin â†’ API Settings:
 *    - supabase_url: Your Supabase Project URL
 *    - supabase_anon_key: Your Supabase Anonymous Key
 *    - supabase_service_role_key: Your Supabase Service Role Key
 * 
 * 2. Install the Supabase client: npm install @supabase/supabase-js
 * 
 * 3. Uncomment the code below and replace database imports with supabase queries.
 * 
 * Environment Variables (set in .env):
 * PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 * PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 */

// Placeholder â€” uncomment when ready
/*
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for public/anonymous queries (storefront)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (uses service role key â€” never expose to frontend)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Example: Fetch all products
export async function fetchProducts() {
  const { data, error } = await supabase
    .from(TABLES.PRODUCTS)
    .select(`
      *,
      variants:product_variants(*),
      media:variant_media(*)
    `)
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data;
}

// Example: Fetch single product by slug
export async function fetchProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from(TABLES.PRODUCTS)
    .select(`
      *,
      variants:product_variants(*),
      media:variant_media(*)
    `)
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data;
}

// Example: Create order
export async function createOrder(orderData: any) {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ORDERS)
    .insert(orderData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Example: Auth â€” verify phone OTP (using Supabase Auth)
export async function verifyPhoneOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: `+91${phone}`,
    token,
    type: 'sms'
  });
  
  if (error) throw error;
  return data;
}
*/

// For now, re-export everything from database as the active database layer
export * from './database';

console.log('[Database] Using local JSON mock database. Set Supabase keys in Admin Settings to switch.');
