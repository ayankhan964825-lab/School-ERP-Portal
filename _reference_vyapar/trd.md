# VyaparPe — Technical Requirements Document (TRD)

> **Version:** 2.0 (Multi-Tenant SaaS Architecture)
> **Last Updated:** 2026-06-14

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
│                                                                  │
│  store.vyaparpe.com    mystore.com    vyaparpe.com (Marketplace) │
└────────────┬──────────────┬──────────────┬───────────────────────┘
             │              │              │
             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                           │
│                    (bom1 — Mumbai Region)                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Astro Middleware (middleware.ts)             │    │
│  │  1. Extract hostname                                     │    │
│  │  2. Resolve store_id from hostname                       │    │
│  │  3. Inject into Astro.locals                             │    │
│  │  4. Verify admin auth for /admin/* routes                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│              ┌─────────────┴──────────────┐                     │
│              ▼                            ▼                     │
│  ┌──────────────────┐        ┌──────────────────┐              │
│  │  Storefront Pages │        │   Admin Pages     │              │
│  │  (SSR + Islands)  │        │   (SSR + React)   │              │
│  └────────┬─────────┘        └────────┬─────────┘              │
│           │                           │                         │
│           ▼                           ▼                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              API Routes (src/pages/api/*)                │    │
│  │  • All queries scoped by store_id from Astro.locals     │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌──────────────────────┐      ┌──────────────────────┐
│    SUPABASE (DB)      │      │  EXTERNAL SERVICES    │
│  PostgreSQL + RLS     │      │                       │
│                       │      │  • Twilio (OTP)       │
│  Tables:              │      │  • iCarry (Shipping)  │
│  • stores             │      │  • Razorpay (Payment) │
│  • products           │      │  • PhonePe (Payment)  │
│  • orders             │      │  • Vercel API (Domains)│
│  • customers          │      │  • Meta/Google Ads API│
│  • settings           │      │  • Resend (Email)     │
│  • wallets            │      └──────────────────────┘
│  • wallet_transactions│
│  • marketplace_listings│
│  • marketplace_apps   │
│  • coupons, addresses │
│  • staff, blog_posts  │
│  • affiliates, etc.   │
└──────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Framework** | Astro | 6.x | SSR mode with React islands |
| **UI Components** | React | 19.x | For interactive islands (cart, checkout, OTP) |
| **Styling** | TailwindCSS | 4.x | Via `@tailwindcss/vite` plugin |
| **Database** | Supabase (PostgreSQL) | — | With Row Level Security (RLS) |
| **Hosting** | Vercel | Pro Plan | Serverless, Mumbai (`bom1`) region |
| **OTP/SMS** | Twilio | — | Platform-level credentials only |
| **Shipping** | iCarry API | v1 | Centralized logistics |
| **Payments** | Razorpay + PhonePe | — | Platform-level gateway |
| **Email** | Resend | — | Transactional emails |
| **State (Client)** | Nanostores | 1.x | Lightweight stores for cart, auth |
| **Language** | TypeScript | 6.x | Strict mode |
| **Package Manager** | npm | — | Node ≥ 22.12.0 |

---

## 3. Database Schema

### 3.1 New Tables (Multi-Tenant)

#### `stores` — The core tenant table
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  domain_status TEXT DEFAULT 'none',        -- none | pending | active
  plan_type TEXT DEFAULT 'free',            -- free | paid | ad_spend | ownership
  commission_rate NUMERIC DEFAULT 5.0,
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

#### `wallets` — One per store
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_commission_paid NUMERIC DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id)
);
```

#### `wallet_transactions` — Financial ledger
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  store_id UUID REFERENCES stores(id),
  order_id TEXT,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,  -- cod_credit | prepaid_credit | commission_debit | shipping_debit | payout | adjustment
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `marketplace_listings` — Products listed on marketplace
```sql
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  marketplace_price NUMERIC,
  marketplace_commission_rate NUMERIC DEFAULT 10.0,
  status TEXT DEFAULT 'pending_review',     -- pending_review | approved | rejected | suspended
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  listed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id)
);
```

#### `marketplace_applications` — Seller KYC
```sql
CREATE TABLE marketplace_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  business_name TEXT,
  gstin TEXT,
  pan TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',            -- pending | approved | rejected
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id)
);
```

### 3.2 Existing Table Modifications

All existing tables get a new column:
```sql
ALTER TABLE products ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE orders ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE customers ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE settings ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE coupons ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE addresses ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE blog_posts ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE staff ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE hero_slides ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE notifications ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE affiliates ADD COLUMN store_id UUID REFERENCES stores(id);
```

**Migration:** Backfill with `UPDATE <table> SET store_id = '<nutridry-uuid>' WHERE store_id IS NULL;`

### 3.3 Row Level Security (RLS)

```sql
-- Example: Products table RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON products
  USING (store_id = current_setting('app.current_store_id')::uuid);
```

> **Note:** Application-level filtering (`.eq('store_id', storeId)`) is the primary isolation mechanism. RLS is a safety net.

---

## 4. Middleware Architecture

### Tenant Resolution Flow

```typescript
// src/middleware.ts — Tenant Resolution
export const onRequest = defineMiddleware(async (context, next) => {
  const hostname = context.url.hostname;

  // 1. Marketplace detection
  if (hostname === 'vyaparpe.com' || hostname === 'www.vyaparpe.com') {
    context.locals.isMarketplace = true;
    context.locals.storeId = null;
    return next();
  }

  // 2. Custom domain lookup (cached)
  let store = getCachedStore(hostname) || await getStoreByCustomDomain(hostname);

  // 3. Subdomain lookup
  if (!store && hostname.endsWith('.vyaparpe.com')) {
    const subdomain = hostname.split('.')[0];
    store = getCachedStore(subdomain) || await getStoreBySubdomain(subdomain);
  }

  // 4. Inject or reject
  if (store && store.status === 'active') {
    context.locals.storeId = store.id;
    context.locals.store = store;
    cacheStore(hostname, store); // 2-min TTL
  } else {
    return new Response('Store not found', { status: 404 });
  }

  // 5. Existing admin auth checks...
  return next();
});
```

### Cache Strategy
- **In-memory Map** with 2-minute TTL per hostname
- Invalidated on store settings update
- Prevents DB round-trip on every page load

---

## 5. API Layer Refactoring

### Pattern: Every function accepts `storeId`

```typescript
// BEFORE (single-tenant)
export async function getProducts() {
  const { data } = await supabase.from('products').select('*');
  return data;
}

// AFTER (multi-tenant)
export async function getProducts(storeId: string) {
  const { data } = await supabase.from('products').select('*').eq('store_id', storeId);
  return data;
}
```

### Files to Refactor

| File | Functions (~count) | Impact |
|------|-------------------|--------|
| `src/lib/database.ts` | ~50+ functions | Every query adds `.eq('store_id', storeId)` |
| `src/lib/twilio.ts` | `sendOTP()` | Uses platform-level credentials, dynamic store name in message |
| `src/lib/icarry.ts` | `createShipment()` | Uses platform-level credentials, per-store pickup address |
| `src/lib/permissions.ts` | `getPermissionContext()` | Must validate staff belongs to correct `store_id` |
| `src/pages/api/**/*.ts` | All API routes | Extract `storeId` from `Astro.locals` |

---

## 6. Custom Domain Integration

### Vercel Domains API Flow

```
Seller enters domain → Backend validates format
  → POST /v10/projects/{projectId}/domains { name: "mystore.com" }
  → Vercel responds with verification records
  → Seller adds CNAME: @ → cname.vercel-dns.com
  → Backend polls: GET /v10/projects/{projectId}/domains/{domain}
  → Once verified: SSL auto-provisioned, domain_status = 'active'
```

### Environment Variables Required
```
VERCEL_API_TOKEN=<your-vercel-api-token>
VERCEL_PROJECT_ID=<your-project-id>
VERCEL_TEAM_ID=<your-team-id>  # if using Vercel team
```

---

## 7. Theming Engine

### Theme Resolution
```typescript
// In layout, inject theme as CSS variables
const store = Astro.locals.store;
const theme = store?.theme_config || {};
const css = `
  :root {
    --color-primary: ${theme.primary_color || '#4CAF50'};
    --color-secondary: ${theme.secondary_color || '#1A1A2E'};
    --color-accent: ${theme.accent_color || '#F7C948'};
    --font-heading: ${theme.font_heading || 'Inter'};
    --font-body: ${theme.font_body || 'Inter'};
  }
`;
```

### Theme Templates
| Template ID | Style | Use Case |
|------------|-------|----------|
| `default` | Clean, modern green | General purpose |
| `minimal` | Whitespace-heavy, sans-serif | Fashion, lifestyle |
| `luxury` | Dark, serif fonts, gold accents | Premium brands |
| `food` | Warm colors, rounded cards | Food & beverages |
| `marketplace` | Neutral, category-focused | VyaparPe marketplace |

---

## 8. Security Architecture

| Layer | Mechanism |
|-------|-----------|
| **Database** | Supabase RLS + application-level `store_id` filtering |
| **Session** | HMAC-SHA256 signed cookies (admin), OTP session cookies (customer) |
| **API** | Middleware blocks unauthenticated admin requests |
| **Tenant Isolation** | Every query includes `store_id` — no cross-tenant data access |
| **OTP** | Platform-level credentials — sellers have zero access to OTP config |
| **Shipping** | Platform-level courier API — sellers cannot intercept logistics |
| **Custom Domains** | Vercel auto-provisions SSL; CNAME verification prevents domain hijacking |

---

## 9. Deployment & Infrastructure

| Aspect | Details |
|--------|---------|
| **Hosting** | Vercel Pro ($20/month), `bom1` region |
| **CI/CD** | `git push master` → Vercel auto-deploys |
| **Database** | Supabase (hosted PostgreSQL, free tier → Pro at scale) |
| **Domains** | Wildcard `*.vyaparpe.com` + per-seller custom domains via Vercel API |
| **Monitoring** | Vercel Speed Insights (already integrated) |
| **Environment** | Node ≥ 22.12.0, TypeScript 6.x strict |
