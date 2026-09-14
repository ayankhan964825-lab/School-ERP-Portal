# VyaparPe — Product Requirements Document (PRD)

> **Version:** 2.0 (Multi-Tenant SaaS)
> **Last Updated:** 2026-06-14
> **Platform Type:** Multi-Tenant E-Commerce SaaS + Marketplace

---

## 1. Vision & Overview

VyaparPe is a multi-tenant e-commerce SaaS platform that enables sellers to create, manage, and scale their own online stores — similar to Dukaan and Shopdeck. In addition to individual storefronts, VyaparPe operates a central **Marketplace** (like Amazon/Flipkart) where verified sellers can list products for broader reach.

### Core Value Proposition
- **For Sellers:** Instant online store creation with zero technical knowledge. Centralized logistics, payments, and OTP — no setup headaches.
- **For VyaparPe:** Revenue from commission on sales, paid plans, and marketplace fees.
- **For Customers:** A unified marketplace experience with products from trusted, verified sellers.

---

## 2. Business Models

| Model | Type | Access | Commission | Monthly Fee | Key Features |
|-------|------|--------|------------|-------------|--------------|
| **A** | Free SaaS | `store.vyaparpe.com` (subdomain) | 5% on sales | ₹0 | Basic storefront, platform logistics, limited theming |
| **B** | Paid Premium SaaS | Custom domain (`store.com`) | Lower % (negotiable) | Paid subscription | All features, visual theme editor, priority support |
| **C** | Ad-Spend Partner | Subdomain or Custom | 3% on sales | ₹0 (min ₹1000/day ad spend on Meta/Google) | Full features, ad-spend tracked via API |
| **D** | One-Time Ownership | Custom domain | 1% on sales | ₹2000/year maintenance | Self-managed, all features |
| **E** | Marketplace | Listed on `vyaparpe.com` | Platform % per sale | ₹0 | Products appear on central VyaparPe marketplace |

> **Note:** Models are combinable. A seller on Model A can also opt into Model E (Marketplace).

---

## 3. User Roles & Personas

### 3.1 Super Admin (VyaparPe Team)
- Creates and manages all stores on the platform
- Manages dynamic **Subscription Plans** (creates "Gold", "Silver" tiers with custom pricing and features)
- Has **Role-Based Access Control (RBAC)** — the main owner can assign specific permissions (e.g., Finance Admin, Marketplace Approver) to their staff.
- Approves marketplace seller applications and product listings
- Processes seller wallet payouts

### 3.2 Seller (Store Owner / Tenant Admin)
- Manages their own store: products, orders, customers, coupons
- Views their wallet balance and transaction ledger
- Can apply for marketplace verification
- Can list approved products on the marketplace
- Premium sellers get visual theme customization

### 3.3 Staff (Seller's Team Members)
- Restricted access based on permissions set by the Seller
- Scoped to the seller's `store_id` — cannot see other stores

### 3.4 Customer (End User)
- Browses and purchases from individual stores or the central marketplace
- Has OTP-based authentication (phone number, no password)
- Can track orders, manage addresses, and view order history

---

## 4. Functional Requirements

### 4.1 Multi-Tenancy & Store Management

| ID | Requirement | Priority |
|----|-------------|----------|
| MT-01 | Each store has a unique `store_id` that scopes all data (products, orders, customers, settings) | P0 |
| MT-02 | Stores belong to a dynamic `subscription_plan` created by the Super Admin | P0 |
| MT-03 | Stores are accessible via subdomains (`store.vyaparpe.com`) | P0 |
| MT-04 | Paid stores can connect custom domains (`store.com`) | P0 |
| MT-05 | Super Admin can create fully-loaded stores instantly (one-click provisioning) | P0 |
| MT-06 | Super Admin has RBAC (Role-Based Access Control) to assign restricted permissions to their team | P0 |
| MT-07 | Existing "The Nutridry" data is preserved as Store #1 (zero downtime migration) | P0 |
| MT-08 | Stores can be suspended/deleted by Super Admin | P1 |
| MT-09 | Middleware resolves tenant from hostname on every request | P0 |
| MT-10 | **Security:** Strict Admin Routing. Custom domains (`mystore.com/admin`) redirect to `mystore.vyaparpe.com/admin` to prevent cross-domain auth failures. | P0 |
| MT-11 | **Security:** Storage Isolation. Seller uploads are restricted to their `store_id/` path via Supabase RLS. | P0 |
| MT-12 | **SEO:** `sitemap.xml` and `robots.txt` are generated dynamically per tenant. | P1 |
| MT-13 | **Security:** Customer isolation. The `customers` table must use a composite unique key: `UNIQUE(phone, store_id)` instead of just `UNIQUE(phone)`. | P0 |
| MT-14 | **State:** Cart persistence (`localStorage`) must be prefixed by `store_id` to prevent cross-subdomain bleed. | P0 |

### 4.2 Authentication & OTP

| ID | Requirement | Priority |
|----|-------------|----------|
| AU-01 | Super Admin logs in via phone OTP (VyaparPe Central) | P0 |
| AU-02 | Seller Admin logs in via phone OTP | P0 |
| AU-03 | Customers log in via phone OTP | P0 |
| AU-04 | Admin panel access requires valid `admin_auth` JWT | P0 |
| AU-05 | **Security:** OTP Endpoint must have strict IP/Phone rate limiting and reCAPTCHA to prevent SMS financial drain by bots. | P0 |
| AU-06 | OTP message is dynamically branded per store (e.g., "Your {store_name} code is: 1234") | P1 |
| AU-07 | Super Admin has a separate, elevated login flow | P0 |

### 4.3 Centralized Logistics

| ID | Requirement | Priority |
|----|-------------|----------|
| LG-01 | All shipping uses VyaparPe's central courier API (iCarry / Shiprocket) | P0 |
| LG-02 | Sellers cannot add or configure their own delivery partners | P0 |
| LG-03 | Pickup address is per-store (from store settings) | P0 |
| LG-04 | COD remittance flows to VyaparPe's bank account first | P0 |
| LG-05 | Shipping cost is deducted from seller's wallet along with commission | P0 |
| LG-06 | **Security:** `icarry_api_token` is removed from tenant settings and moved to platform `.env` | P0 |

### 4.4 Wallet, Payments & Commission Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| WL-01 | Each store has a wallet with a running balance | P0 |
| WL-02 | Commission is auto-calculated based on the store's plan type | P0 |
| WL-03 | COD: Gross collection − commission − shipping = net credit to wallet | P0 |
| WL-04 | Prepaid: Payment received − commission = net credit to wallet | P0 |
| WL-05 | Sellers can view their transaction ledger (credits, debits, commissions) | P0 |
| WL-06 | Sellers can request payouts; Super Admin approves and processes | P1 |
| WL-07 | Platform revenue dashboard for Super Admin | P1 |
| WL-08 | **Security:** `razorpay` and `phonepe` credentials are removed from tenant settings and moved to platform `.env` | P0 |
| WL-09 | **Security:** Wallet deductions and payouts use database Row-Level Locking (`SELECT ... FOR UPDATE`) to prevent double-spend race conditions. | P0 |
| WL-10 | **Security:** Webhooks (Razorpay/PhonePe) must strictly verify HMAC signatures to prevent forged payment payloads. | P0 |

### 4.5 Marketplace (Model E)

| ID | Requirement | Priority |
|----|-------------|----------|
| MP-01 | `vyaparpe.com` serves as central marketplace for approved listings | P0 |
| MP-02 | Sellers apply for marketplace KYC via Admin panel | P1 |
| MP-03 | Customers can add products from multiple sellers to a single cart | P0 |
| MP-04 | Single checkout payment via central Razorpay account | P0 |
| MP-05 | Backend splits multi-seller orders by `store_id` | P0 |
| MP-06 | Marketplace URLs must include `product_id` to prevent slug collisions between stores (e.g., `vyaparpe.com/product/slug-p123`). | P0 |
| MK-01 | Sellers must pass KYC verification before listing on marketplace | P0 |
| MK-02 | Each product listing requires Super Admin approval | P0 |
| MK-03 | Seller details (store URL, phone, email) are hidden on marketplace | P0 |
| MK-04 | Only a controlled display name (e.g., "VPE Verified Seller") is shown | P0 |
| MK-05 | Marketplace has its own storefront at `vyaparpe.com` with search, categories, and filters | P1 |
| MK-06 | Multi-seller cart: orders are split by seller at checkout | P1 |
| MK-07 | Marketplace commission rate can differ from the seller's SaaS plan rate | P1 |
| MK-08 | Seller ratings and reviews on marketplace | P2 |

### 4.6 Custom Storefront Theming

| ID | Requirement | Priority |
|----|-------------|----------|
| TH-01 | Each store has a `theme_id` (base template) and `theme_config` (custom overrides) | P1 |
| TH-02 | Super Admin can change any store's theme | P0 |
| TH-03 | Premium sellers get a visual theme editor in their admin panel | P1 |
| TH-04 | Free sellers can only change colors and logo | P1 |
| TH-05 | Theme config includes: colors, fonts, hero layout, product card style, navbar style | P1 |
| TH-06 | Custom CSS injection is supported for advanced customization | P2 |

### 4.7 Custom Domains

| ID | Requirement | Priority |
|----|-------------|----------|
| CD-01 | Sellers enter their domain in Admin → Settings → Domain | P0 |
| CD-02 | System shows DNS instructions (CNAME to `cname.vercel-dns.com`) | P0 |
| CD-03 | Backend calls Vercel Domains API to add the domain programmatically | P0 |
| CD-04 | SSL is auto-provisioned by Vercel (Let's Encrypt) | P0 |
| CD-05 | Domain status tracked: `none` → `pending` → `active` | P0 |
| CD-06 | Requires Vercel Pro plan ($20/month) | P0 |

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Security** | Supabase Row Level Security (RLS) prevents cross-tenant data access |
| **Security** | Admin sessions are signed with HMAC-SHA256 to prevent cookie tampering |
| **Performance** | Tenant resolution is cached in-memory (2-minute TTL) to avoid DB calls per request |
| **Performance** | Vercel serverless in `bom1` region (Mumbai) for low latency in India |
| **Scalability** | Supabase PostgreSQL scales to millions of rows; Vercel auto-scales serverless functions |
| **Availability** | Zero downtime during migration — existing store continues functioning throughout |
| **Cost** | Fixed platform cost: ~$20/month (Vercel Pro). All other costs are variable/pay-per-use |

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| Stores created in first 3 months | 50+ |
| Marketplace verified sellers | 20+ |
| Platform uptime | 99.9% |
| Tenant data isolation failures | 0 |
| Average store provisioning time | < 30 seconds |

---

## 7. Out of Scope (v1)

- Mobile apps (iOS/Android) for sellers or customers
- Multi-language / i18n support
- White-label platform reselling
- Inventory sync with offline POS hardware
- Advanced analytics / BI dashboards
