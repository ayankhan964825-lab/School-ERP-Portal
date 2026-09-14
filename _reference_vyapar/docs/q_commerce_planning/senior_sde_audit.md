# 🔬 Senior SDE Audit: Multi-Warehouse Plan vs. Actual Codebase

> **Auditor Perspective:** 10-year SDE, code-level review
> **Verdict:** The plan captures the vision well, but has **14 critical gaps** that will cause production failures or stalled development if not addressed before coding begins.

---

## Audit Methodology

I read every file the plan references line-by-line, plus files the plan **doesn't mention but should**. Here is what I found.

---

## 🔴 GAP 1: The Plan Misses 5 Files That Also Need Changes

The plan lists 12 existing APIs to modify. After a full `grep`, I found **5 more files** that directly read `variant.stock` or call `decrementInventoryStock` and will **silently break** if not updated:

| # | Missed File | What It Does | Why It Breaks |
|---|---|---|---|
| 1 | [cart/stock.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/cart/stock.ts) | Real-time cart stock badge (`"Only 3 left!"`) | Reads `variant.stock` directly (line 35). After migration, this value is meaningless — stock lives in `inventory_levels`. **Customer will see wrong stock counts.** |
| 2 | [checkout/razorpay.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/checkout/razorpay.ts) | Creates Razorpay order and saves pending order | Has the same `store_id` grouping logic (lines 44-102) that needs `location_id` splitting. **Plan only mentions cod.ts, verify-payment.ts, zero.ts, phonepe-callback.ts but not razorpay.ts.** |
| 3 | [checkout/phonepe.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/checkout/phonepe.ts) | Creates PhonePe order and saves pending order | Same issue as razorpay.ts — has identical `store_id` grouping that needs location split. **Plan only mentions phonepe-callback.ts.** |
| 4 | [webhooks/icarry.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/webhooks/icarry.ts) | Courier status updates (delivered, RTO, cancelled) | Calls `updateOrderStatus()` which triggers `atomic_update_order_status` RPC. After migration, this RPC must restore stock to the correct `location_id`. **Currently it has no concept of which location to restore to.** |
| 5 | [admin/bulk_upload.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/admin/bulk_upload.ts) | CSV product import | Sets `variant.stock` on bulk-imported products (line 41). After migration, stock must go into `inventory_levels` at a specific `location_id`. **Entire bulk upload will produce orphan stock.** |

> [!CAUTION]
> If we start coding Phase 1 without updating these 5 files, the system will have **phantom stock** (stock that exists in `product_variants` but not in `inventory_levels`), **wrong cart badges**, and **broken webhook-triggered refunds**.

---

## 🔴 GAP 2: The Plan Underestimates the RPC Rewrite Scope

The plan says "rewrite 3 RPCs, create 3 new ones". The actual count after reading the SQL is **7 RPCs that must change**:

| # | RPC Name | File | What the Plan Says | What Actually Needs Happening |
|---|---|---|---|---|
| 1 | `atomic_process_order_inventory` | [final_master_audit_fixes_v9.sql](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/final_master_audit_fixes_v9.sql) | ✅ Listed | Must accept `location_id` per item and lock `inventory_levels` rows |
| 2 | `atomic_confirm_payment` | Same file, line 367 | ✅ Listed | Same — but this one is harder because it re-derives items from `orders.items` JSONB column. Must also derive `location_id` from `fulfillments` table |
| 3 | `atomic_create_marketplace_order` | Same file, line 255 | ❌ **NOT in the plan** | This is the **master orchestrator** that calls `atomic_process_order_inventory` internally. It must pass `location_id` per item down to the inventory RPC. If this isn't updated, the whole chain breaks |
| 4 | `atomic_update_order_status` | Same file, line 457 | ❌ **NOT in the plan** | Handles cancel/RTO by calling `atomic_restore_order_inventory`. After migration, it must know **which location** to restore stock to. Currently it has no concept of location |
| 5 | `atomic_restore_order_inventory` | Referenced by #4 | ❌ **NOT in the plan** | The actual function that increments `product_variants.stock` on cancellation. Must target `inventory_levels` instead |
| 6 | `atomic_process_flash_sale_inventory` | Called from #3, line 274 | ❌ **NOT in the plan** | Flash sale stock decrement. Must be location-aware if flash sale stock is tied to a location |
| 7 | `atomic_process_icarry_webhook` | [webhooks/icarry.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/webhooks/icarry.ts), line 38 | ❌ **NOT in the plan** | The iCarry webhook RPC that updates order status atomically. Must handle location-aware stock restoration on RTO |

> [!WARNING]
> Missing RPCs #3 and #4 is the single biggest risk in this plan. `atomic_create_marketplace_order` is the **only** function that actually creates orders in the database. If it doesn't pass `location_id`, inventory will be decremented from `product_variants` (old system) even after the migration.

---

## 🔴 GAP 3: Massive Code Duplication Risk — The "6 Checkout Files" Problem

Look at the current architecture:

```
razorpay.ts  → groups items by store_id → calls saveMarketplaceOrder()
phonepe.ts   → groups items by store_id → calls saveMarketplaceOrder()
cod.ts       → groups items by store_id → calls saveMarketplaceOrder() + decrementInventoryStock()
zero.ts      → groups items by store_id → calls saveMarketplaceOrder() + decrementInventoryStock()
verify-payment.ts → groups items by store_id → calls atomic_confirm_payment RPC
phonepe-callback.ts → finds order by transactionId → calls atomic_confirm_payment RPC
```

**The store_id grouping logic is copy-pasted 4 times** across `razorpay.ts`, `phonepe.ts`, `cod.ts`, `zero.ts` (lines 44-108 are nearly identical). The plan says "add location_id split to all 4 checkout APIs" — but if we do that naively, we'll have **the same complex routing algorithm copy-pasted 6 times**.

### Recommendation: Extract a Shared `routeOrderByLocation()` Function

```typescript
// src/lib/orderRouter.ts (NEW)
export async function routeOrderByLocation(
  validatedItems: any[],
  customerPincode: string,
  storeId: string
): Promise<{ locationId: string; items: any[] }[]> {
  // 1. Query inventory_levels for all variant_ids
  // 2. Find locations with sufficient stock
  // 3. Sort by proximity to customerPincode
  // 4. Greedy allocation: assign items to nearest location with stock
  // 5. Return grouped items per location_id
}
```

Then every checkout file just calls this function. This also means **future changes to the routing algorithm only need to be made in one place**.

---

## 🔴 GAP 4: The `saveMarketplaceOrder` → RPC Pipeline Is Tightly Coupled

Currently the flow is:
1. JavaScript groups items by `store_id` and builds `subOrders[]` array
2. `saveMarketplaceOrder()` passes everything to `atomic_create_marketplace_order` RPC
3. The RPC inserts into `master_orders` and `orders` tables and decrements inventory

After migration, we need to add a third dimension:
1. JavaScript groups items by `store_id` AND THEN by `location_id`
2. For each `(store_id, location_id)` pair, we need a **fulfillment** record
3. The RPC must create `fulfillments` rows and decrement `inventory_levels`

**The sub-order structure changes.** Currently:
```
Master Order → Sub-Orders (one per store_id) → Items
```

After migration:
```
Master Order → Sub-Orders (one per store_id) → Fulfillments (one per location_id) → Items
```

This is a **schema-level design decision** that the plan doesn't specify:
- Does each `(store_id, location_id)` get its own AWB? → **Yes**, because the pickup address differs
- Does each `(store_id, location_id)` get its own row in `orders`? → **Probably not** (too breaking), better to keep `orders` as-is and add a `fulfillments` child table
- How does the Admin UI show this? → "Order #123 has 2 shipments from 2 locations"

---

## 🟡 GAP 5: No Migration Strategy for `product_variants.stock` → `inventory_levels`

The plan says "auto-create a Default Warehouse for existing sellers" but doesn't specify the **data migration SQL**. This is critical:

```sql
-- Migration: Move existing stock to inventory_levels
INSERT INTO inventory_levels (variant_id, location_id, available, committed, store_id)
SELECT 
  pv.id,
  l.id,  -- the auto-created "Default Warehouse" for this store
  pv.stock,
  0,  -- no committed stock at migration time
  pv.store_id
FROM product_variants pv
JOIN locations l ON l.store_id = pv.store_id AND l.is_default = true;
```

**But what about the `stock` column on `product_variants`?** We have two options:
1. **Keep it as a computed cache** (SUM of all `inventory_levels.available` for that variant) — requires triggers or application-level sync
2. **Drop it entirely** — breaks all existing admin UIs, cart stock checks, and the `getProducts` function which reads `variant.stock` (line 406 of [database.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/database.ts#L406))

### Recommendation: Keep `product_variants.stock` as a **materialized cache** with a database trigger:
```sql
CREATE OR REPLACE FUNCTION sync_variant_stock_cache() RETURNS TRIGGER AS $$
BEGIN
  UPDATE product_variants 
  SET stock = (
    SELECT COALESCE(SUM(available), 0) 
    FROM inventory_levels 
    WHERE variant_id = COALESCE(NEW.variant_id, OLD.variant_id)
  )
  WHERE id = COALESCE(NEW.variant_id, OLD.variant_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_stock_cache
AFTER INSERT OR UPDATE OR DELETE ON inventory_levels
FOR EACH ROW EXECUTE FUNCTION sync_variant_stock_cache();
```

This way, **all existing code that reads `variant.stock` continues to work without changes** while we gradually migrate each API to read from `inventory_levels` directly. This is the backward-compatible approach.

---

## 🟡 GAP 6: `processOrderCommission` Has No Location Awareness

[processOrderCommission](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/database.ts#L755-L819) deducts both **platform commission** and **shipping cost** from the seller's wallet when an order is marked "delivered".

After migration:
- If an order splits across 2 locations, there will be **2 fulfillments**, each with its own shipping cost
- Commission should be deducted **once per sub-order** (as it is now), but shipping should be deducted **per fulfillment** (once per AWB)
- The current code at line 791 deducts `shippingAmount` from `order.shipping`, which is the sub-order level shipping. This needs to become `SUM(fulfillments.shipping_cost)` for that sub-order

---

## 🟡 GAP 7: RBAC / Permissions Not Addressed

The plan adds 12 new API endpoints but doesn't mention how they integrate with the existing [permissions.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/permissions.ts) system.

Every admin API checks `canManageSection(ctx, 'orders')` or `canManageSection(ctx, 'products')`. The new APIs need:

| New API | Required Permission |
|---|---|
| `/api/admin/locations` | New section: `'locations'` or reuse `'settings'` |
| `/api/admin/inventory-levels` | Reuse `'products'` |
| `/api/admin/inventory-transfer` | New section: `'inventory_transfer'` (dangerous operation, shouldn't be available to all staff) |
| `/api/admin/fulfillments` | Reuse `'orders'` |
| `/api/admin/delivery-zones` | New section: `'delivery'` or reuse `'settings'` |

---

## 🟡 GAP 8: No Rollback Plan

What if the migration breaks production? The plan has no rollback strategy. We need:

1. **Feature flag:** `settings.multi_warehouse_enabled = true/false` per store
2. **Dual-write period:** During transition, write to BOTH `product_variants.stock` AND `inventory_levels` 
3. **Read switch:** If flag is `false`, continue reading `product_variants.stock`. If `true`, read `SUM(inventory_levels.available)`
4. The stock cache trigger (GAP 5) naturally provides this dual-write

---

## 🟡 GAP 9: The Plan's Phase 1 Timeline Is Optimistic

The plan says "4-5 weeks" for Phase 1. After counting the actual scope:

| Task | My Estimate |
|---|---|
| Migration SQL (7 tables + 7 RPCs + triggers + migration script) | 2 weeks |
| `orderRouter.ts` (routing algorithm + tests) | 1 week |
| Modify 6 checkout files + `saveMarketplaceOrder` + `decrementInventoryStock` | 1.5 weeks |
| Modify `shipping.ts`, `bulk_upload.ts`, `cart/stock.ts`, `inventory.ts` | 1 week |
| Admin UI (Locations CRUD, per-location stock, fulfillments view) | 2 weeks |
| iCarry webhook + order status update changes | 0.5 weeks |
| Testing (edge cases, concurrent checkout, cancel/RTO, split orders) | 1.5 weeks |

**Realistic estimate: 8-10 weeks** for a single developer, or **5-6 weeks** with 2 developers working in parallel (one on backend, one on admin UI).

---

## 🟢 GAP 10: `getProducts()` Cache Invalidation

[getProducts()](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/database.ts#L362-L365) has a 60-second in-memory cache. After migration, if the stock cache trigger updates `product_variants.stock`, the cached products will still show stale stock for up to 60 seconds. 

This is acceptable for storefront display but **dangerous for checkout validation**. The `validateCheckoutItems()` function calls `getProducts()` too — meaning a customer could bypass a stock check by racing within the cache window.

**Fix:** The `validateCheckoutItems()` function should bypass the cache and query `inventory_levels` directly for real-time stock at a specific location.

---

## 🟢 GAP 11: Notification System Not Updated

[sendNotifications](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/notifications.ts) is called from all checkout files. Currently it sends one notification per order. After migration:
- Split shipments mean multiple AWBs per order → customer should get multiple "shipped" notifications
- Each fulfillment has its own tracking number → "Your order #123 has been shipped! Track: AWB_001" and separately "Your order #123 (Part 2) has been shipped! Track: AWB_002"

---

## 🟢 GAP 12: Plan Mentions `FOR UPDATE` on `inventory_levels` But Doesn't Address Deadlocks

If two concurrent orders both need items from Location A and Location B, but they lock in different order:
- Order 1 locks Location A first, then tries Location B
- Order 2 locks Location B first, then tries Location A
- **Deadlock.**

**Fix:** Always lock `inventory_levels` rows in a deterministic order (e.g., sorted by `variant_id + location_id`). The existing `atomic_process_order_inventory` RPC iterates items in the order they're passed — this must be changed to sort items first.

---

## 🟢 GAP 13: Supabase Realtime Broadcast Limitation

Part 7 says "use Supabase Realtime Broadcast so data goes directly to the customer without DB writes." This is correct but has a caveat:

**Supabase Broadcast is ephemeral.** If the customer's browser disconnects and reconnects, they lose all GPS data from while they were offline. The Rider's latest position is gone.

**Fix:** On the Rider App side, also write the **last known position** to a `rider_assignments` row (or even a Redis/KV store) every 30 seconds. When the customer reconnects, the page fetches this row first, then subscribes to the Broadcast channel for live updates.

---

## 🟢 GAP 14: The `orders.items` JSONB Doesn't Store `location_id`

Currently, order items are stored as a JSONB array inside the `orders` table:
```json
[{"product_id": "...", "variant_name": "500g", "quantity": 2}]
```

After migration, we need to know **which location each item was fulfilled from** (for returns, RTO, auditing). The plan proposes a `fulfillments` table, but the `atomic_confirm_payment` RPC (line 396-409 of the SQL) **re-derives items from `orders.items` JSONB**. It has no way to know which `location_id` each item is assigned to.

**Fix:** Store `location_id` inside the fulfillment records, and modify `atomic_confirm_payment` to derive `location_id` from `fulfillments` instead of from `orders.items`.

---

## ✅ Revised Phase 1 Checklist (Complete)

Based on this audit, here is the **actually complete** Phase 1 task list:

### Database Layer
- [ ] Create `locations` table with `store_id` FK, RLS policies
- [ ] Create `inventory_levels` table (variant_id + location_id → available, committed)
- [ ] Create `fulfillments` table (links order items to a location_id + AWB)
- [ ] Create `inventory_transactions` audit table
- [ ] Create stock cache trigger (`inventory_levels` → `product_variants.stock`)
- [ ] Write data migration SQL (existing stock → Default Warehouse → `inventory_levels`)
- [ ] Rewrite `atomic_process_order_inventory` RPC (target `inventory_levels`, sort for deadlock prevention)
- [ ] Rewrite `atomic_restore_order_inventory` RPC (location-aware)
- [ ] Rewrite `atomic_create_marketplace_order` RPC (pass `location_id` per item, create `fulfillments`)
- [ ] Rewrite `atomic_confirm_payment` RPC (derive `location_id` from `fulfillments`)
- [ ] Rewrite `atomic_update_order_status` RPC (restore to correct location on cancel/RTO)
- [ ] Update `atomic_process_icarry_webhook` RPC (location-aware RTO restoration)
- [ ] Decide on `atomic_process_flash_sale_inventory` (location-tied or virtual pool?)

### Application Layer (Shared)
- [ ] Create `src/lib/orderRouter.ts` — single routing function used by all checkout flows
- [ ] Add feature flag: `settings.multi_warehouse_enabled` per store
- [ ] Add `'locations'` permission section to [permissions.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/permissions.ts)

### Application Layer (Modifications)
- [ ] Update `getProducts()` in [database.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/database.ts#L362) — stock comes from cache trigger, no changes needed immediately
- [ ] Update `validateCheckoutItems()` in [checkout.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/checkout.ts) — bypass cache, check `inventory_levels` directly
- [ ] Update `decrementInventoryStock()` in [database.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/database.ts#L2249) — target `inventory_levels` at specific `location_id`
- [ ] Update `saveMarketplaceOrder()` in [database.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/database.ts#L906) — pass `location_id` per item to RPC
- [ ] Update `processOrderCommission()` in [database.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/lib/database.ts#L755) — per-fulfillment shipping deduction
- [ ] Modify [checkout/cod.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/checkout/cod.ts) — use `orderRouter.ts`
- [ ] Modify [checkout/zero.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/checkout/zero.ts) — use `orderRouter.ts`
- [ ] Modify [checkout/razorpay.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/checkout/razorpay.ts) — use `orderRouter.ts`
- [ ] Modify [checkout/phonepe.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/checkout/phonepe.ts) — use `orderRouter.ts`
- [ ] Modify [checkout/verify-payment.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/checkout/verify-payment.ts) — location-aware confirm
- [ ] Modify [checkout/phonepe-callback.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/checkout/phonepe-callback.ts) — location-aware confirm
- [ ] Modify [cart/stock.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/cart/stock.ts) — read from `inventory_levels` SUM or cache
- [ ] Modify [admin/inventory.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/admin/inventory.ts) — accept `location_id`
- [ ] Modify [admin/shipping.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/admin/shipping.ts) — use fulfillment's pickup address
- [ ] Modify [admin/bulk_upload.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/admin/bulk_upload.ts) — stock goes to `inventory_levels`
- [ ] Modify [admin/update-order-status.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/admin/update-order-status.ts) — no direct change needed (calls RPC)
- [ ] Modify [webhooks/icarry.ts](file:///c:/Users/faisa/vyaparpe/the%20nutridry/storefront/src/pages/api/webhooks/icarry.ts) — ensure RPC handles location restoration

### New APIs
- [ ] Build `/api/admin/locations` (CRUD)
- [ ] Build `/api/admin/inventory-levels` (view & update per location)
- [ ] Build `/api/admin/fulfillments` (view fulfillments per order)
- [ ] Build `/api/admin/fulfillments/[id]/ship` (generate AWB per fulfillment)

### Admin UI
- [ ] Locations management page (CRUD)
- [ ] Inventory page: per-location stock view & edit
- [ ] Order detail page: show fulfillments + per-fulfillment AWB
- [ ] Ship order flow: show which fulfillment to ship next

### Testing
- [ ] Unit tests for `orderRouter.ts` (single location, multi-location, out-of-stock, split scenarios)
- [ ] Integration test: concurrent checkout on last unit
- [ ] Integration test: cancel order → stock restores to correct location
- [ ] Integration test: RTO via iCarry webhook → stock restores to origin location
- [ ] Integration test: existing single-warehouse seller (feature flag off) still works unchanged
- [ ] Migration dry-run on staging with real data

---

## Summary Scorecard

| Area | Plan Score | Gap Severity |
|---|---|---|
| Vision & Architecture | ⭐⭐⭐⭐⭐ | Excellent |
| Edge Case Coverage | ⭐⭐⭐⭐ | Good (missed deadlock, cache, notifications) |
| API Surface Completeness | ⭐⭐⭐ | **5 files missed** |
| RPC/SQL Scope | ⭐⭐ | **4 critical RPCs missed** |
| Migration Strategy | ⭐⭐ | No migration SQL, no backward compat strategy |
| Code Duplication Prevention | ⭐ | 6 checkout files will get copy-pasted routing logic |
| Timeline Realism | ⭐⭐ | 4-5 weeks → realistically 8-10 weeks solo |
| Rollback Plan | ⭐ | None specified |

**Overall: The plan is an excellent starting point but needs these 14 gaps resolved before coding begins to avoid production incidents and rewrite cycles.**
