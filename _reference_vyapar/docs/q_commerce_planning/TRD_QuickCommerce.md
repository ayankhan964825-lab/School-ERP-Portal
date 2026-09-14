# Technical Requirements Document (TRD): VyaparPe Quick Commerce

## 1. Architectural Overview
The system moves from a 2-tier inventory model (`stores` -> `product_variants.stock`) to a 3-tier inventory model (`stores` -> `locations` -> `inventory_levels`). Order items are no longer fulfilled directly from a cart array; they are broken down into `fulfillments` (one per location) to enable split shipments and localized tracking.

## 2. Database Schema Additions (Postgres)
* **`locations`:** Stores warehouse data, PostGIS coordinates, and Q-Commerce zone parameters (`radius_km`, `pincodes[]`).
* **`inventory_levels`:** Maps `variant_id` to `location_id` with `available` and `committed` states.
* **`fulfillments`:** A child of `orders`. Contains the `location_id`, assigned `awb_number`, and a subset of `orders.items` being fulfilled from that location.
* **`inventory_transactions`:** An append-only audit log for stock changes.

## 3. Backward Compatibility & Data Migration
* **Stock Cache Trigger:** A Postgres trigger on `inventory_levels` automatically executes `SUM(available)` and writes to `product_variants.stock`. This allows all legacy frontend and admin code to read `pv.stock` without breaking.
* **Migration Script:** A SQL script will auto-create a "Default Warehouse" for every store and migrate existing `pv.stock` into `inventory_levels` mapped to that default warehouse.

## 4. Admin Panel Inventory Settings (Backward Compatibility)
The new Multi-Warehouse architecture fully respects the existing global settings defined by the seller:
* **Global Inventory Tracking Setting:** If a seller toggles this OFF in the admin panel, the `orderRouter` will completely bypass stock validation. It will blindly assign incoming orders to the Default Warehouse without checking or decrementing `inventory_levels.available`. 
* **Bulk Order Tracking Setting (`isB2B`):** Currently, the system checks `settings.bulk_order_inventory_tracking`. 
  * If **OFF**, B2B/Bulk orders bypass stock deduction (useful for made-to-order bulk requests where physical warehouse stock doesn't matter). The new `atomic_process_order_inventory` RPC will continue to ignore `isB2B=true` items, preventing them from crashing due to "Out of Stock".
  * If **ON**, the `orderRouter` will algorithmically split the massive B2B quantity (e.g., 500 units) across multiple warehouses (e.g., 300 from Delhi, 200 from Mumbai) to fulfill it from physical stock.

## 5. The Order Router (`orderRouter.ts`)
Instead of duplicating `store_id` splitting logic across 4 checkout APIs, a unified `orderRouter.ts` handles it.
* **Algorithm:**
  1. Check `settings.multi_warehouse_enabled`. If false, assign all items to Default Warehouse (Bypass mode).
  2. If true, map customer location against all active `locations` holding stock.
  3. Group items by `(store_id, location_id)`.
  4. If an item exceeds single-location stock (e.g., B2B bulk), split the item across multiple locations.
  5. Return an array of fulfillment structures to the payment gateway.

## 5. RPC Failsafes & Edge Case Handling
* **Concurrent Checkouts:** `atomic_process_order_inventory` applies `FOR UPDATE` locks on `inventory_levels`, ordering by `(variant_id, location_id)` to prevent deadlocks.
* **Payment Timeouts:** Stock moves to `committed` during gateway redirect. A background job (or webhook failure) restores it to `available` if payment is abandoned.
* **RTO (Return to Origin):** `atomic_process_icarry_webhook` reads the `location_id` from the `fulfillments` table, ensuring returned stock increments at the correct origin warehouse.
* **Partial Cancellations:** `atomic_update_order_status` accepts specific variant IDs to restore, looking up their origin location in `fulfillments`.
* **Flash Sales:** Bypasses local `inventory_levels` locking. Uses a virtual global pool (`product.flash_sale_stock`) to prevent DB bottlenecks, deferring physical warehouse assignment to a post-checkout background worker.

## 6. Real-time Rider Tracking (Leaflet / Google Maps)
* **Active-Only Websockets:** To minimize Supabase costs, real-time GPS coordinates are broadcasted via Supabase Realtime *only* if the Page Visibility API confirms the customer has the app open. 
* **Fallback:** The rider app writes a "Last Known Location" to the DB every 30 seconds for cold-start loads.
* **Map Rendering:** The frontend conditionally renders `<MapContainer>` (Leaflet/OSM) or `<GoogleMap>` (BYOK) based on the seller's `locations` configuration.
