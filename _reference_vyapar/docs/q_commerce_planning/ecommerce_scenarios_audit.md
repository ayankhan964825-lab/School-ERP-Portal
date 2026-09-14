# E-Commerce Scenario & Edge Case Audit Report

> **Focus:** Multi-Warehouse & Q-Commerce Edge Cases
> **Goal:** Ensure the system is bulletproof against real-world e-commerce chaos.

Here is the comprehensive audit of how the planned architecture will tackle the most complex e-commerce scenarios.

---

### 1. Concurrent Checkout (The "Last Unit" Problem)
**Scenario:** Only 1 unit of a protein bar is left in the Delhi warehouse. Customer A (paying via Razorpay) and Customer B (paying via COD) hit "Place Order" at the exact same millisecond.
**How it's tackled:** The `atomic_create_marketplace_order` Postgres RPC uses `FOR UPDATE` row-level locks on the `inventory_levels` table. The database processes them one by one. Customer A gets the lock, stock drops to 0. Customer B's transaction sees 0 stock and fails instantly with an "Out of Stock" error. No double-selling.

### 2. Payment Gateway Delay (The "30-Second Ghost" Problem)
**Scenario:** Customer C enters Razorpay. They take 3 minutes to enter their OTP. Meanwhile, the stock depletes. 
**How it's tackled:** When they click "Pay", the item is moved from `available` stock to `committed` stock (reserved). If the payment fails or times out, a cron job (or webhook failure) moves it back to `available`. If it succeeds, the `atomic_confirm_payment` RPC finalizes the deduction.

### 3. RTO (Return to Origin) 
**Scenario:** Courier attempts delivery 3 times, fails, and sends the item back to the seller. 
**How it's tackled:** The `webhooks/icarry.ts` receives the RTO status. The `atomic_process_icarry_webhook` RPC looks up the specific `location_id` on the `fulfillments` table for that AWB, and increments the stock **only** at that origin warehouse.

### 4. Customer Returns to Wrong Warehouse
**Scenario:** Customer returns an item originally shipped from Mumbai, but the courier drops it at the seller's Pune warehouse.
**How it's tackled:** In the Admin Panel, when a seller manually marks an order as "Returned", there will be a dropdown: *"Restock to which warehouse?"* (Defaults to origin). They can select Pune, and the system increments Pune's `inventory_levels`.

### 5. Partial Order Cancellation
**Scenario:** Customer orders 3 items (2 from Delhi, 1 from Noida). They cancel the Noida item before dispatch.
**How it's tackled:** The `atomic_update_order_status` RPC takes an array of specific `variant_ids` being cancelled. It looks up the `fulfillments` table for those specific items, finds they were assigned to Noida, and restores the stock to Noida without affecting the Delhi items.

### 6. Warehouse Goes Offline Mid-Fulfillment
**Scenario:** A seller's Mumbai warehouse floods. They disable it in the admin panel. But there are 50 pending orders assigned to it.
**How it's tackled:** Disabling a location sets `is_active = false`. This stops *new* orders from routing there. For the 50 pending orders, the Admin Panel will flag them as "Fulfillment Blocked." The seller can use a "Re-Route" button to assign them to the Delhi warehouse (which will run a stock-check transaction before re-assigning).

### 7. Split Shipment & Shipping Costs
**Scenario:** Customer buys Item A and Item B. They are in different warehouses.
**How it's tackled:** Handled in the plan. Customer pays 1 flat shipping fee. The `orderRouter` creates 2 `fulfillments` (2 AWBs). The `processOrderCommission` script debits the seller's wallet for the actual cost of both AWBs.

### 8. Negative Inventory (Offline POS Sync)
**Scenario:** The seller has a physical store. They sell an item over the counter, but the offline POS hasn't synced yet. An online customer buys the same item.
**How it's tackled:** Online orders will process normally. When the POS syncs, the `inventory_levels.available` will drop to `-1`. The system allows negative stock for Admin/POS overrides, but triggers a "Low Stock Alert" so the seller knows they have an inventory discrepancy.

### 9. Q-Commerce Rider Re-assignment (No Riders Available)
**Scenario:** Customer orders via 30-min Q-Commerce. The system pings Dunzo, but no riders are available in that area.
**How it's tackled:** The system retries for 5 minutes. If it fails, the order status changes to "Q-Commerce Failed - Action Required". The seller gets an alert and can either assign an In-House rider or click "Downgrade to Standard Shipping" (which uses iCarry).

### 10. Flash Sale Inventory
**Scenario:** Flash sale launches. 1,000 people buy instantly. 
**How it's tackled:** Flash sale stock bypasses the location-specific locking and uses a "Virtual Global Pool" (`product.flash_sale_stock`). Once the order is confirmed, a background worker assigns the physical fulfillment to the nearest warehouses post-checkout, preventing database bottlenecks during the high-traffic checkout phase.

### 11. Stale Cart Cache
**Scenario:** Customer leaves an item in their cart overnight. Next morning, it's out of stock, but their cart still shows it.
**How it's tackled:** When they hit checkout, `validateCheckoutItems()` bypasses all Redis caches and directly hits the `inventory_levels` database table in real-time to verify stock before generating the Razorpay link.

### 12. B2B Bulk Orders
**Scenario:** A B2B buyer wants 500 kg of almonds. The Delhi warehouse has 300 kg, Mumbai has 200 kg.
**How it's tackled:** The `orderRouter` recognizes the requested quantity exceeds any single location. It automatically splits the B2B order across both warehouses to fulfill the 500 kg requirement.

---

### Audit Conclusion
The revised Multi-Warehouse architecture **fully covers** all of these scenarios. By relying on atomic Postgres RPCs (`FOR UPDATE` row locking) and isolating location data into a dedicated `fulfillments` table, the system is fundamentally protected against race conditions, ghost stock, and routing errors.
