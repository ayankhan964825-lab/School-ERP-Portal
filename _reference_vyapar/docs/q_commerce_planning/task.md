# Multi-Warehouse Migration: Execution Sprints

To ensure high-quality code and zero regressions, Phase 1 is broken down into micro-sprints. We will execute and verify one sprint at a time.

## Sprint 1.1: Core Database Schema (COMPLETED)
- [x] Create `locations`, `inventory_levels`, `fulfillments`, `inventory_transactions` tables.
- [x] Create backward-compatible `product_variants.stock` trigger.
- [x] Data Migration: Auto-create "Default Warehouse" and move existing stock.

## Sprint 1.2: Order Creation RPCs
- [x] Rewrite `atomic_process_order_inventory` (Multi-location `FOR UPDATE` lock ordering)
- [x] Rewrite `atomic_create_marketplace_order` (Insert into `fulfillments` instead of pure order array)
- [x] Rewrite `atomic_process_flash_sale_inventory` (Virtual global pool fallback)

## Sprint 1.3: Post-Order RPCs
- [x] Rewrite `atomic_confirm_payment` (Move stock from `committed` -> deduct)
- [x] Rewrite `atomic_restore_order_inventory` (Move stock from `committed` -> `available` on timeout/failure)
- [x] Rewrite `atomic_update_order_status` & `atomic_process_icarry_webhook` (RTO logic)

## Sprint 1.4: The Order Router Engine
- [x] Create `src/lib/orderRouter.ts` (Split logic & Feature Flag bypass)
- [x] Refactor `checkout/razorpay.ts` to use `orderRouter`
- [x] Refactor `checkout/zero.ts` to use `orderRouter`
- [x] Refactor `saveMarketplaceOrder()` to use the new router.

## Sprint 1.5: Checkout & Cart API Refactoring
- [x] Refactor `checkout/cod.ts`, `zero.ts`, `razorpay.ts`, `phonepe.ts`
- [x] Refactor `checkout/verify-payment.ts`
- [x] Refactor `cart/stock.ts` (Real-time cart badges checking locations)
- [x] Refactor `checkout/verify-pincode.ts` (Check Q-Commerce zones for ETA)

## Sprint 1.6: Admin Order & Tracking APIs
- [x] Refactor `admin/update-order-awb.ts` (Fulfillment level AWB)
- [x] Refactor `admin/mark-delivered.ts` (Quick Commerce manual delivery)
- [x] Refactor `admin/orders.astro` (Display fulfillments to Admin)
- [x] Create `admin/assign-rider.ts` & `admin/update-rider-status.ts` (Q-Commerce)
- [x] Refactor `track-order.ts` (Return split fulfillments)
- [x] Refactor `admin/shipping.ts` & `admin/invoice.ts`

## Sprint 1.7: Admin UI (The final visual layer)
- [x] Build "Location & Fulfillment" API (`api/admin/locations.ts`)
- [x] Build "Location & Fulfillment" UI (`admin/settings/locations.astro`)
- [x] Update Inventory Page API to support `location_id` (`api/admin/inventory.ts`)
- [x] Update Inventory Page UI to show warehouse dropdown (`admin/inventory.astro`)
- [x] Update Order Details page to add "Assign Rider" UI (`admin/orders.astro`)

## Bug Fixes (Post-Audit)
- [x] Fix `assign-rider.ts` schema mismatch with `fulfillments` table
- [x] Fix `bulk_upload.ts` to sync initial stock to `inventory_levels`
