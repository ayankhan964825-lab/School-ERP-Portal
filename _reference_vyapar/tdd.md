# VyaparPe — Technical Design Document (TDD)

> **Version:** 2.0 (Multi-Tenant SaaS)
> **Last Updated:** 2026-06-14

---

## 1. Data Layer Design

### 1.1 Tenant Context Propagation

Every request flows through this pipeline:

```
HTTP Request → Middleware (resolves store_id) → Astro.locals.storeId
  → Page/API extracts storeId → database.ts function(storeId)
  → Supabase query includes .eq('store_id', storeId)
```

**Type Definition:**
```typescript
// src/env.d.ts
declare namespace App {
  interface Locals {
    storeId: string | null;
    store: StoreRecord | null;
    isMarketplace: boolean;
  }
}

interface StoreRecord {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  plan_type: 'free' | 'paid' | 'ad_spend' | 'ownership';
  commission_rate: number;
  theme_id: string;
  theme_config: Record<string, any>;
  status: 'active' | 'suspended' | 'deleted';
  marketplace_verified: boolean;
  marketplace_display_name: string | null;
}
```

### 3.1 New Tables (Multi-Tenant)

#### `subscription_plans` — Dynamic paid plans
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                   -- e.g., "Silver", "Gold", "Platinum"
  price_monthly NUMERIC DEFAULT 0,
  price_yearly NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 5.0,  -- Override default commission
  features JSONB DEFAULT '{}',          -- Feature flags (e.g., {"custom_domain": true, "premium_themes": false})
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `super_admin_roles` — RBAC for VyaparPe team
```sql
CREATE TABLE super_admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                   -- e.g., "Owner", "Marketplace Approver", "Finance Manager"
  permissions JSONB DEFAULT '{}',       -- e.g., {"can_approve_stores": true, "can_process_payouts": false}
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `stores` — The core tenant table
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  domain_status TEXT DEFAULT 'none',        -- none | pending | active
  plan_id UUID REFERENCES subscription_plans(id),
  commission_rate NUMERIC,                  -- Override per store
  owner_phone TEXT NOT NULL,
  owner_email TEXT,
  owner_name TEXT,
  logo_url TEXT,
  theme_id TEXT DEFAULT 'default',
  theme_config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',             -- active | suspended | deleted
  marketplace_verified BOOLEAN DEFAULT false,
  marketplace_verified_at TIMESTAMPTZ,
  marketplace_display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

### 1.2 Database Function Signature Convention

All database functions follow this pattern:

```typescript
// Query functions: storeId is the FIRST parameter
export async function getProducts(storeId: string): Promise<Product[]>
export async function getOrders(storeId: string): Promise<Order[]>
export async function getSettings(storeId: string): Promise<Settings>

// Mutation functions: storeId is included in the data object
export async function saveProduct(storeId: string, product: ProductInput): Promise<Product>
export async function saveOrder(storeId: string, order: OrderInput): Promise<Order>

// Platform-level functions (Super Admin only): no storeId
export async function getAllStores(): Promise<StoreRecord[]>
export async function createStore(data: CreateStoreInput): Promise<StoreRecord>
```

### 1.3 Cache Strategy

```
┌─────────────────────────────────────────┐
│            Memory Cache Map              │
│                                          │
│  Key                    │ TTL            │
│  ─────────────────────  │ ──────         │
│  store:subdomain:xyz    │ 2 min          │
│  store:domain:xyz.com   │ 2 min          │
│  settings:{storeId}     │ 2 sec          │
│  products:{storeId}     │ 5 min          │
│  categories:{storeId}   │ 5 min          │
└─────────────────────────────────────────┘
```

- Store lookups: **2-minute** TTL (rarely changes)
- Settings: **2-second** TTL (needs quick refresh after admin saves)
- Products: **5-minute** TTL (acceptable staleness)
- Cache is **per-Vercel-function-instance** (not shared across instances)

---

## 2. Wallet & Commission Engine Design

### 2.1 Commission Calculation

```typescript
interface CommissionInput {
  storeId: string;
  orderId: string;
  orderAmount: number;      // Grand total paid by customer
  shippingCost: number;     // Actual cost to ship (from courier)
  paymentMethod: 'cod' | 'prepaid';
  planType: string;
}

function calculateCommission(input: CommissionInput): WalletTransaction[] {
  const store = getStore(input.storeId);
  const commissionRate = store.commission_rate; // e.g., 5%
  const commission = Math.round(input.orderAmount * commissionRate / 100);

  const transactions: WalletTransaction[] = [];

  // Credit: what the seller earns
  transactions.push({
    type: input.paymentMethod === 'cod' ? 'cod_credit' : 'prepaid_credit',
    amount: input.orderAmount,
    description: `Order ${input.orderId} — Gross collection`
  });

  // Debit: platform commission
  transactions.push({
    type: 'commission_debit',
    amount: -commission,
    description: `${commissionRate}% platform commission on ${input.orderId}`
  });

  // Debit: shipping cost
  if (input.shippingCost > 0) {
    transactions.push({
      type: 'shipping_debit',
      amount: -input.shippingCost,
      description: `Shipping cost for ${input.orderId}`
    });
  }

  return transactions;
  // Net wallet credit = orderAmount - commission - shippingCost
}
```

### 2.2 Wallet Balance Update (Concurrency Safe)

```sql
-- Atomic balance update (prevents race conditions)
-- CRITICAL: Must be run inside a transaction (BEGIN; ... COMMIT;)
-- so that SELECT ... FOR UPDATE locks the row against double-spends.
BEGIN;
SELECT balance FROM wallets WHERE store_id = $1 FOR UPDATE;

UPDATE wallets
SET balance = balance + $2,
    total_earned = total_earned + GREATEST($2, 0),
    total_commission_paid = total_commission_paid + ABS(LEAST($2, 0)),
    last_updated = now()
WHERE store_id = $1;
COMMIT;
```

### 2.3 Payout Flow

```
Seller requests payout (₹5000)
  → wallet_transactions: INSERT { type: 'payout', amount: -5000, status: 'pending' }
  → Super Admin sees payout request in dashboard
  → Super Admin transfers ₹5000 to seller's bank (manual/UPI)
  → Super Admin marks payout as 'completed'
  → wallet balance reduced by ₹5000
```

---

## 3. Marketplace Design

### 3.1 Product Visibility Logic

```typescript
// Marketplace query: only show approved listings from verified sellers
async function getMarketplaceProducts(filters?: MarketplaceFilters) {
  let query = supabase
    .from('marketplace_listings')
    .select(`
      *,
      product:products(*),
      store:stores(marketplace_display_name, marketplace_verified)
    `)
    .eq('status', 'approved')
    .eq('is_active', true)
    .eq('store.marketplace_verified', true);

  if (filters?.category) query = query.eq('product.category', filters.category);
  if (filters?.minPrice) query = query.gte('marketplace_price', filters.minPrice);
  if (filters?.maxPrice) query = query.lte('marketplace_price', filters.maxPrice);

  return query;
}
```

### 3.2 Seller Anonymity Enforcement

```typescript
// When rendering marketplace product cards:
function renderMarketplaceProduct(listing: MarketplaceListing) {
  return {
    name: listing.product.name,
    price: listing.marketplace_price || listing.product.price,
    images: listing.product.images,
    // ALLOWED:
    sellerDisplayName: listing.store.marketplace_display_name || 'VPE Seller',
    // BLOCKED (never exposed):
    // listing.store.subdomain  ← HIDDEN
    // listing.store.custom_domain  ← HIDDEN
    // listing.store.owner_phone  ← HIDDEN
    // listing.store.owner_email  ← HIDDEN
  };
}
```

### 3.3 Multi-Seller Cart & Order Splitting

```
Cart: [ProductA (Seller 1), ProductB (Seller 2), ProductC (Seller 1)]

At checkout:
  → Group by store_id:
    Seller 1: [ProductA, ProductC]  → Sub-Order #1
    Seller 2: [ProductB]            → Sub-Order #2

  → Create 2 separate orders in the database
  → Each order has its own AWB (shipping label)
  → Each seller sees only their sub-order
  → Commission calculated per sub-order
```

---

## 4. Theming Engine Design

### 4.1 Theme Injection in Layout

```astro
---
// src/layouts/StoreLayout.astro
const store = Astro.locals.store;
const theme = store?.theme_config || {};
---
<html>
<head>
  <style define:vars={{
    colorPrimary: theme.primary_color || '#4CAF50',
    colorSecondary: theme.secondary_color || '#1A1A2E',
    colorAccent: theme.accent_color || '#F7C948',
    fontHeading: theme.font_heading || 'Inter',
    fontBody: theme.font_body || 'Inter'
  }}>
    :root {
      --color-primary: var(--colorPrimary);
      --color-secondary: var(--colorSecondary);
      --color-accent: var(--colorAccent);
      --font-heading: var(--fontHeading);
      --font-body: var(--fontBody);
    }
  </style>
  {theme.custom_css && <style set:html={theme.custom_css} />}
</head>
```

### 4.2 Conditional Layout Components

```astro
---
const heroLayout = store?.theme_config?.hero_layout || 'default-slider';
---
{heroLayout === 'default-slider' && <HeroSlider slides={slides} />}
{heroLayout === 'full-width-banner' && <HeroBanner image={heroImage} />}
{heroLayout === 'split-text-image' && <HeroSplit text={heroText} image={heroImage} />}
```

---

## 5. Custom Domain Verification Design

### 5.1 Domain Addition API

```typescript
// src/middleware.ts — Tenant Resolution
export const onRequest = defineMiddleware(async (context, next) => {
  const hostname = context.url.hostname;
  const pathname = context.url.pathname;

  // 0. Strict Admin Routing (Security Fix)
  // Prevent cross-domain cookie failures by forcing admin traffic to subdomains
  if (pathname.startsWith('/admin') && !hostname.endsWith('.vyaparpe.com') && hostname !== 'localhost') {
    // Look up the store's subdomain
    const store = await getStoreByCustomDomain(hostname);
    if (store) {
      return context.redirect(`https://${store.subdomain}.vyaparpe.com${pathname}`, 301);
    }
  }

  // 1. Marketplace detection
  if (hostname === 'vyaparpe.com' || hostname === 'www.vyaparpe.com') {
    // ... logic
  }
});
```

### 5.2 Domain Verification Check

```typescript
// Called when seller clicks "Verify" or via periodic cron
export async function checkDomainStatus(domain: string): Promise<string> {
  const res = await fetch(
    `https://api.vercel.com/v13/domains/${domain}/config`,
    { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } }
  );
  const data = await res.json();

  if (data.misconfigured === false) {
    return 'active';  // DNS is correct, SSL provisioned
  }
  return 'pending';   // Still waiting for DNS propagation
}
```

---

## 6. Store Provisioning (One-Click)

### Super Admin creates a store:

```typescript
async function provisionStore(input: CreateStoreInput): Promise<StoreRecord> {
  // 1. Create store record
  const store = await createStore({
    name: input.name,
    subdomain: input.subdomain,
    owner_phone: input.ownerPhone,
    plan_type: input.planType,
    commission_rate: getDefaultCommissionRate(input.planType),
    theme_id: 'default'
  });

  // 2. Create default settings
  await createSettings(store.id, {
    store_name: input.name,
    contact_phone: input.ownerPhone,
    cod_enabled: true,
    free_shipping_threshold: 499,
    flat_shipping_rate: 60
  });

  // 3. Create wallet
  await createWallet(store.id);

  // 4. Create owner as staff (admin role)
  await createStaff(store.id, {
    phone: input.ownerPhone,
    name: input.ownerName || 'Store Owner',
    role: 'super_admin',
    hierarchy_level: 0
  });

  // 5. (Optional) Copy sample products
  if (input.includeSampleProducts) {
    await copySampleProducts(store.id);
  }

  return store;
}
```

---

## 7. Error Handling & Edge Cases

| Layer | Mechanism |
|-------|-----------|
| **Database** | Supabase RLS + application-level `store_id` filtering |
| **Storage** | Supabase RLS on buckets: Sellers can only upload/delete in their own `store_id/` path |
| **Session** | HMAC-SHA256 signed cookies (admin), OTP session cookies (customer) |
| **API** | Middleware blocks unauthenticated admin requests |
| **Tenant Isolation** | Every query includes `store_id` — no cross-tenant data access |
| **OTP** | Platform-level credentials — sellers have zero access to OTP config |
| **Shipping** | Platform-level courier API — sellers cannot intercept logistics |
| **Custom Domains** | Vercel auto-provisions SSL; CNAME verification prevents domain hijacking |
| **Transactions** | Wallet deductions use PostgreSQL Row-Level Locking (`FOR UPDATE`) to prevent double-spend |
| **Global** | Alert Super Admin, block new orders if balance < -₹2000 |
| Vercel domain API rate limit | Exponential backoff with retry |
| OTP service down | Return user-friendly error, log for Super Admin |
| Two sellers claim same custom domain | First-come-first-served, DB unique constraint prevents duplicates |
