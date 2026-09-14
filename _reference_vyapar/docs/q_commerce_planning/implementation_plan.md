# Multi-Warehouse Inventory & Q-Commerce: Improved Implementation Blueprint

> **Audited Against:** VyaparPe Codebase (Multi-Tenant SaaS + Marketplace)
> **Status:** Revised after Senior SDE Audit (Incorporates all 14 gap fixes)
> **Date:** 2026-07-02

---

## Part 1: Architecture & Data Migration (The Foundation)

### 1. Database Schema Additions
| Table | Purpose |
|---|---|
| `locations` | Warehouses, stores, suppliers per `store_id` (FK to `stores`) |
| `inventory_levels` | `variant_id` + `location_id` → `available`, `committed` |
| `inventory_transactions` | Audit ledger (who changed what stock, why) |
| `fulfillments` | Links `orders` to a `location_id` with its own AWB |
| `inventory_transfers` | Track stock movements between locations |

### 2. Backward-Compatible Migration Strategy
We cannot just drop `product_variants.stock`, as it would break dozens of existing files and queries instantly. 
**Solution:** We will migrate it to a **Materialized Cache**:
1. **Migration SQL:** Move existing `pv.stock` into `inventory_levels` mapped to an auto-created "Default Warehouse" for every store.
2. **Database Trigger:** A Postgres trigger on `inventory_levels` will automatically `SUM(available)` and update `product_variants.stock`.
### 3. Feature Flags & 100% Backward Compatibility (Opt-In Only)
You raised a very important point: **Quick Commerce and Multi-Warehouse are complex to manage.** If a small seller doesn't need them, their dashboard should remain simple and secure.
- **The "Standard E-Commerce" Default:** When we launch this update, **nothing changes** for existing sellers. Their store will continue to work exactly as it does today (single warehouse, standard courier delivery). 
- **Opt-In Settings:** In the admin panel, there will be two new toggles: 
  - `Enable Multi-Location Fulfillment`
  - `Enable Quick Commerce Zones`
- **Fallback Logic:** If these toggles are OFF, the `orderRouter.ts` will completely skip the complex routing and just assign everything to their "Default Warehouse" and standard shipping, exactly like the current system. This guarantees stability.

---

## Part 2: Code Refactoring (Eliminating Tech Debt)

### 1. The "Order Router" (Fixing 6x Code Duplication)
Currently, `store_id` splitting logic is copy-pasted across 4 checkout APIs (`razorpay.ts`, `phonepe.ts`, `cod.ts`, `zero.ts`). Moving to multi-location means adding a second, much harder split (`location_id`).

**The Fix:** We will create a single, unified `orderRouter.ts`:
```typescript
// src/lib/orderRouter.ts
export async function routeOrderByLocation(
  validatedItems: any[],
  customerPincode: string,
  storeId: string
): Promise<{ locationId: string; items: any[] }[]>
```
All checkout files will call this single function. This prevents duplicated bugs and makes adding future routing rules (e.g., weight-based routing) trivial.

### 2. The 7 Critical RPC Rewrites
The previous plan missed the core master orchestrator RPC. The full list of RPCs to rewrite is:
1. `atomic_create_marketplace_order`: **(CRITICAL)** Must pass `location_id` down to the inventory processor and insert `fulfillments` rows.
2. `atomic_process_order_inventory`: Must lock `inventory_levels` (ordered sequentially to prevent deadlocks) and decrement stock per location.
3. `atomic_confirm_payment`: Must derive location data from the new `fulfillments` table, not `orders.items`.
4. `atomic_update_order_status`: Handles order cancellations.
5. `atomic_restore_order_inventory`: Must restore cancelled stock back to the **origin location**, not globally.
6. `atomic_process_flash_sale_inventory`: (Subject to open question #4 below).
7. `atomic_process_icarry_webhook`: Must correctly restore inventory upon RTO.

---

## Part 3: Every API That Needs to Be Built or Modified

### A. New APIs to Build

| # | API Endpoint | Method | Purpose | Priority |
|---|---|---|---|---|
| 1 | `/api/admin/locations` | GET/POST/PUT/DELETE | CRUD for warehouse/store locations | P0 |
| 2 | `/api/admin/inventory-levels` | GET/POST/PUT | View & update stock per variant per location | P0 |
| 3 | `/api/admin/inventory-transfer` | POST | Transfer stock between locations (atomic) | P1 |
| 4 | `/api/admin/fulfillments` | GET | View which locations are fulfilling an order | P0 |
| 5 | `/api/admin/fulfillments/[id]/ship` | POST | Generate AWB for a specific fulfillment (not whole order) | P0 |

### B. Existing APIs to Modify (The Exhaustive List)

| Existing File | What Changes | Impact |
|---|---|---|
| `checkout/cod.ts` | Replace routing logic with `orderRouter.ts` | **HIGH** |
| `checkout/zero.ts` | Replace routing logic with `orderRouter.ts` | **HIGH** |
| `checkout/razorpay.ts` | Replace routing logic with `orderRouter.ts` | **HIGH** |
| `checkout/phonepe.ts` | Replace routing logic with `orderRouter.ts` | **HIGH** |
| `checkout/verify-payment.ts` | Location-aware payment confirmation | **HIGH** |
| `checkout/phonepe-callback.ts`| Location-aware payment confirmation | **HIGH** |
| `lib/database.ts` (saveMarketplaceOrder) | Pass `location_id` per item to RPC | **HIGH** |
| `lib/database.ts` (processOrderCommission) | Deduct shipping per-fulfillment, not per-order | **HIGH** |
| `lib/checkout.ts` (validateCheckoutItems)| Bypass 60s cache; check `inventory_levels` directly | **HIGH** |
| `cart/stock.ts` | Real-time cart badges must read `inventory_levels` | MEDIUM |
| `admin/bulk_upload.ts` | CSV import must add stock to `inventory_levels` | **HIGH** |
| `admin/inventory.ts` | Accept `location_id` for manual stock updates | **HIGH** |
| `admin/shipping.ts` | Generate AWB using fulfillment's pickup location | **HIGH** |
| `webhooks/icarry.ts` | Ensure RPC restores stock to origin location on RTO | **HIGH** |
| `track-order.ts` | Update to return array of fulfillments for split tracking | MEDIUM |
| `admin/update-order-awb.ts` | **(E-Commerce Only)** Update AWB on specific fulfillment, not global order | **HIGH** |
| `admin/update-order-status.ts` | Notifications must handle multiple AWBs | MEDIUM |
| `admin/assign-rider.ts` | **[NEW] (Q-Commerce Only)** Assigns a local rider to a fulfillment instead of AWB | **HIGH** |
| `admin/update-rider-status.ts` | **[NEW] (Q-Commerce Only)** Rider app hits this to update (Assigned -> En Route -> Delivered) | **HIGH** |
| `checkout/verify-pincode.ts` | Update to check Q-commerce zones and return ETA | **HIGH** |
| `admin/invoice.ts` | Split invoices by fulfillment if required | LOW |

---

## Part 4: E-Commerce Edge Case Handling (The Failsafes)

Based on the scenario audit, we are implementing strict database-level failsafes to handle the most complex e-commerce edge cases:

1. **Concurrent Checkouts ("Last Unit" Problem):** We use Postgres `FOR UPDATE` row-level locks on `inventory_levels` during the `atomic_create_marketplace_order` RPC. This guarantees that if two customers buy the last item at the exact same millisecond, the database serializes the requests, preventing double-selling.
2. **Payment Gateway Timeouts ("30-Second Ghost"):** Stock is moved from `available` to `committed` the moment the Razorpay window opens. If they abandon the payment, a background job restores the stock.
3. **RTOs & Cancellations (Origin Restoration):** When a return or cancellation occurs, the `atomic_update_order_status` RPC will lookup the exact `location_id` on the `fulfillments` table, ensuring the stock is restored to the specific origin warehouse, not a global pool.
4. **Offline POS Sync (Negative Stock):** The system permits `inventory_levels.available` to temporarily drop into negative numbers (e.g., -1) if an offline POS syncs a sale that was already bought online. It triggers a "Low Stock Discrepancy" alert for the admin to manually audit, rather than crashing the sync.
5. **B2B Bulk Splits:** If a B2B buyer orders 500 units, but Warehouse A has 300 and Warehouse B has 200, the `orderRouter` will automatically split the single order item across two `fulfillments`.

---

## Part 5: The Rider App Strategy (Hybrid Approach)

We will implement a **Hybrid Q-Commerce Fulfillment Model** to give sellers the ultimate flexibility and offload platform API costs.

1. **Option A: 3rd-Party Logistics (Dunzo / Shadowfax)**
   - Backend directly integrates with Dunzo/Shadowfax APIs.
   - **Cost to VyaparPe:** ₹0 (Dunzo provides the tracking `<iframe>` for free).
   - **Cost to Seller:** ₹30-80 per delivery (auto-deducted from VyaparPe wallet). We can add a ₹5 platform markup.

2. **Option B: In-House Rider Fleet (VyaparPe Rider App)**
   - We build a white-label "VyaparPe Rider" app (Premium SaaS Tier feature). 
   - **"Bring Your Own Key" (BYOK):** The seller provides their own Google Maps API key in the admin panel to cover map load costs. Alternatively, they can toggle on a 100% Free "OpenStreetMap/Leaflet" view.
   - **"Active-Only" Tracking:** To eliminate massive Supabase DB and websocket costs, we use the `Page Visibility API`. The websocket only streams GPS data if the customer is actively looking at the screen. The Rider App broadcasts GPS via Supabase Realtime (bypassing DB writes), and writes "Last Known Location" to the DB every 30s as a fallback.
   - **Cost to VyaparPe:** Flat $25/mo Supabase Pro tier (massively optimized).

---

## Part 5: Realistic Phased Rollout (8-10 Weeks)

> *Note: Timeline expanded based on Senior SDE audit of actual codebase complexity.*

### Phase 1: Core Multi-Warehouse (5-6 weeks)
- [ ] Database migrations, triggers, and `locations` table.
- [ ] Rewrite all 7 SQL RPCs (`atomic_create_marketplace_order`, etc.).
- [ ] Build `orderRouter.ts` and refactor the 6 checkout flows to use it.
- [ ] Modify `admin/bulk_upload.ts`, `cart/stock.ts`, `lib/checkout.ts`.
- [ ] Admin UI: Locations CRUD and multi-location inventory table.
- [ ] Fulfillments logic: Split shipments, per-fulfillment AWBs, and per-fulfillment shipping commissions.
- [ ] Testing: Deadlocks, concurrent checkouts, multi-location returns.

### Phase 2: Dynamic Delivery Promises & Q-Commerce Zones (1-2 weeks)
- [ ] Enable PostGIS in Supabase for radius calculations.
- [ ] Add zone configuration to `locations` table:
  - `q_commerce_enabled` (boolean)
  - `zone_type` (enum: 'radius', 'pincode')
  - `delivery_radius_km` (integer)
  - `delivery_pincodes` (array of strings)
- [ ] Build `/api/storefront/delivery-promise` API:
  - **The Logic:** When a customer views a product, check their location (GPS or Pincode) against all warehouse zones where the product is in stock.
  - If they are **inside** a Q-Commerce enabled zone: Show "Available for Quick Commerce" (e.g., 30 Min Delivery).
  - If they are **outside** the zone (or the nearby warehouse is out of stock, but a distant one has it): Show "Available for Normal Delivery" (e.g., 2-3 Days).
- [ ] Frontend: Show dynamic ETA badge on product cards and product details page.

### Phase 3: Quick Commerce 3rd-Party APIs (2-3 weeks)
- [ ] Integrate Dunzo and Shadowfax APIs.
- [ ] Order routing fork: Standard (iCarry) vs Q-Commerce (Dunzo/Shadowfax).
- [ ] Wallet deduction logic for Q-Commerce delivery fees.

### Phase 4: VyaparPe In-House Rider App (3-4 weeks)
- [ ] React Native Rider App (GPS tracking, order queue).
- [ ] WebSocket real-time tracking (Supabase Realtime Broadcast).
- [ ] Customer-facing map animation UI (Google Maps BYOK / Leaflet).

---

## Part 6: Finalized Architecture Decisions (Resolved)

To ensure there are no blockers for development, I have finalized the remaining edge cases using SaaS & E-commerce industry best practices:

1. **Split Shipments (Shipping Costs):** 
   - **Decision:** The customer pays a **single shipping fee** (or gets free shipping) based on their total cart value, just like they do today. The Seller absorbs the cost of the second AWB on the backend. Customers should not be penalized because the seller split their inventory across multiple locations.
2. **Q-Commerce Priority:**
   - **Decision:** We will **strictly complete Phase 1 (Core Multi-Warehouse) first**. Q-Commerce relies heavily on the `locations` and `fulfillments` tables. Building both simultaneously introduces too much architectural risk. We will lay the foundation, test it in production, and then immediately begin Q-Commerce routing.
3. **Flash Sales Stock:**
   - **Decision:** Flash Sale stock will remain a **"Virtual Global Pool"**. Tying flash sales to a specific warehouse leads to regional stock-outs while other warehouses sit on unsold discounted inventory. When a flash sale item is bought, the system will simply decrement the "Flash Sale Pool" and assign the physical fulfillment to the nearest warehouse that has standard stock available.
