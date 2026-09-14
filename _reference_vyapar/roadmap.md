# VyaparPe — Execution Roadmap

> **Version:** 2.0 (Multi-Tenant SaaS)
> **Last Updated:** 2026-06-14

This roadmap outlines the step-by-step execution plan to transform "The Nutridry" into the multi-tenant VyaparPe platform. It is designed to ensure **zero downtime** for the existing store.

---

## Phase 1: Database & Backend Foundation
*Objective: Prepare the data layer to support multiple tenants.*

- [ ] Create `stores`, `wallets`, `wallet_transactions` tables in Supabase.
- [ ] Create marketplace tables: `marketplace_listings`, `marketplace_applications`.
- [ ] Add `store_id` foreign key to all existing tables (`products`, `orders`, `customers`, etc.).
- [ ] **Migration Script:** Backfill existing data with The Nutridry's UUID as `store_id = 1`.
- [ ] Implement Supabase Row Level Security (RLS) policies scoped to `store_id`.
- [ ] Write backend helper functions: `getStoreBySubdomain()`, `getStoreByCustomDomain()`.

## Phase 2: Middleware & Tenant Resolution
*Objective: Route incoming traffic to the correct store dynamically.*

- [ ] Update `src/middleware.ts` to extract hostname (subdomain or custom domain).
- [ ] Implement marketplace detection logic (`hostname === 'vyaparpe.com'`).
- [ ] Fetch and inject `storeId` and `store` object into `Astro.locals`.
- [ ] Implement in-memory caching (Map) for tenant resolution to minimize DB latency.
- [ ] Create a 404 "Store Not Found" fallback page.

## Phase 3: Data Layer Refactor (The Heavy Lift)
*Objective: Scope all database queries to the current tenant.*

- [ ] Refactor `src/lib/database.ts` — every function must accept `storeId` and append `.eq('store_id', storeId)`.
- [ ] Update all API routes (`src/pages/api/*`) to pass `locals.storeId` to DB functions.
- [ ] Update all Astro pages to pass `locals.storeId` to data fetching functions.
- [ ] Test thoroughly: Ensure "The Nutridry" storefront works exactly as before.

## Phase 4: Authentication Overhaul
*Objective: Transition to platform-wide OTP authentication.*

- [ ] Move Twilio API credentials from per-store `settings` to platform `process.env`.
- [ ] Update `sendOTP` logic to include dynamic store names in the SMS text.
- [ ] Build the Seller Admin Login page (Phone + OTP only, no passwords).
- [ ] Build the Seller Onboarding/Signup flow.

## Phase 5: Super Admin Dashboard
*Objective: Build the master control center for VyaparPe.*

- [ ] Create new UI section at `/super-admin`.
- [ ] **Store Creator:** Build the one-click "Create Fully Loaded Store" action.
- [ ] Build the Tenant Management list (view all stores, suspend, delete).
- [ ] Build the Platform Revenue dashboard.
- [ ] Build the Domain Manager (monitor Vercel DNS).

## Phase 6: Custom Domains & Theming
*Objective: Enable premium SaaS features.*

- [ ] Build the Custom Domain settings UI in the Tenant Admin panel.
- [ ] Integrate Vercel Domains API for programmatic domain addition and DNS checking.
- [ ] Implement the CSS Variable injection system in `StoreLayout.astro`.
- [ ] Build the Theme Editor UI for premium sellers.

## Phase 7: Wallet & Commission Engine
*Objective: Automate money flow.*

- [ ] Build the commission calculation logic based on `plan_type` and payment method.
- [ ] Implement atomic database updates for wallet balances.
- [ ] Build the Wallet Dashboard for sellers (view balance, transaction ledger).
- [ ] Build the Payout Request system (seller requests, Super Admin approves).

## Phase 8: VyaparPe Marketplace
*Objective: Launch the central Amazon-style storefront.*

- [ ] Build Super Admin UI for reviewing Seller KYC applications.
- [ ] Build Super Admin UI for reviewing Product Listings.
- [ ] Build the `vyaparpe.com` marketplace homepage, search, and category pages.
- [ ] Implement Multi-Seller Cart logic.
- [ ] Refactor checkout API to split marketplace orders by `store_id`.

---

## Timeline Estimate

| Phase | Estimated Effort | Focus Area |
|-------|-----------------|------------|
| 1. DB Prep | 1 Day | Supabase, SQL |
| 2. Middleware | 1 Day | Edge, Astro locals |
| 3. DB Refactor | 2-3 Days | TypeScript, API routes |
| 4. Auth | 1-2 Days | React, Twilio, JWT |
| 5. Super Admin | 2 Days | Astro, React |
| 6. Domains/Theme | 2 Days | Vercel API, CSS |
| 7. Wallets | 2 Days | Financial logic, SQL |
| 8. Marketplace | 3-4 Days | Complex UI, Order splitting |
| **Total** | **~2-3 Weeks** | Dedicated development |
