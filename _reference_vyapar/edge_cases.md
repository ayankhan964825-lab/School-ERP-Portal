# VyaparPe — Edge Cases & Technical Risks

> **Version:** 2.0 (Multi-Tenant SaaS + Marketplace)
> **Last Updated:** 2026-06-14

This document outlines critical edge cases, technical constraints, and risk mitigation strategies for the VyaparPe platform.

---

## 1. Tenant Data Bleed (The Deadliest Sin)
**Risk:** A bug in an API query accidentally omits the `.eq('store_id', storeId)` filter, causing Store A's orders to be visible to Store B.
**Mitigation:** 
1. **Application Layer:** Strict TypeScript typing. The `storeId` parameter must be required, not optional, on all database functions.
2. **Database Layer (Safety Net):** Supabase Row Level Security (RLS). Even if the application forgets the filter, RLS policies will reject the query if the `current_setting('app.current_store_id')` doesn't match the row's `store_id`.

## 2. Vercel Domain Hijacking
**Risk:** Seller A registers `mystore.com`. Later, their plan expires or they leave. Seller B comes along and registers `mystore.com` in their VyaparPe admin panel, taking over the traffic.
**Mitigation:**
1. Database UNIQUE constraint on `custom_domain`.
2. When a store is deleted or downgraded, the backend MUST call the Vercel Domains API to explicitly `DELETE` the domain from the Vercel project. Only then can it be re-claimed.

## 3. Middleware Latency
**Risk:** `middleware.ts` runs on *every single request* (images, CSS, API, pages). If it does a database lookup every time, latency will spike and Supabase connections will exhaust.
**Mitigation:**
1. In-memory Map caching in the Edge function.
2. Fast-fail static assets. Middleware should immediately `return next()` for requests to `/assets/*`, `/*.png`, `/*.css`, etc., without checking tenant context.

## 4. Wallet Concurrency (Race Conditions)
**Risk:** Two simultaneous webhook requests from Razorpay arrive at the exact same millisecond. They both read `balance = 1000`, add `500`, and save `1500`. The true balance should be `2000` (1000 + 500 + 500).
**Mitigation:**
1. Never perform `SELECT balance` then `UPDATE balance` in code.
2. Always use relative SQL updates: `UPDATE wallets SET balance = balance + $1 WHERE store_id = $2`.

## 5. Negative Wallet Balances
**Risk:** A seller has ₹100 in their wallet. A customer places a COD order. The shipping fee is ₹150. Wallet drops to -₹50.
**Mitigation:**
1. Allow negative balances up to a certain threshold (e.g., -₹2000).
2. If balance < -₹2000, automatically suspend the seller's ability to accept new COD orders (or suspend the store entirely) until they recharge their wallet via a payment gateway.

## 6. The Nutridry Downtime During Migration
**Risk:** Changing the schema breaks the currently live "The Nutridry" store.
**Mitigation:**
1. Create the `stores` table and insert "The Nutridry" with ID `1`.
2. Add `store_id` columns with a default value of `1`.
3. In this state, the old code still works perfectly because it ignores the `store_id` column.
4. Deploy the new codebase. The middleware will map `thenutridry.com` to ID `1`, and all queries will explicitly ask for ID `1`.

## 7. Multi-Seller Checkout Complexities
**Risk:** Customer buys from Seller A and Seller B in one cart. Payment gateway succeeds, but database insertion fails for Seller B's order.
**Mitigation:**
1. Use Supabase RPC (Remote Procedure Call) or a backend transaction. All sub-orders must be inserted in a single atomic transaction. Either all succeed, or all fail.

## 8. Seller Deletes an "Approved" Marketplace Product
**Risk:** Seller deletes a product from their store, but it's still linked in `marketplace_listings`, causing broken pages or 500 errors on `vyaparpe.com`.
**Mitigation:**
1. PostgreSQL foreign keys: `product_id UUID REFERENCES products(id) ON DELETE CASCADE`. If the product is deleted, the marketplace listing is automatically purged.

## 9. API Rate Limits
**Risk:** Vercel Domains API rate limits us if we add/remove too many custom domains quickly.
**Mitigation:**
1. Implement exponential backoff in the domain verification polling logic.

## 10. SEO Dilution
**Risk:** Identical products exist on `storeA.vyaparpe.com` and `vyaparpe.com` (Marketplace). Google penalizes both for duplicate content.
**Mitigation:**
1. Use canonical tags. The seller's store page should have `<link rel="canonical" href="https://vyaparpe.com/product/xyz">` if the product is listed on the marketplace.
