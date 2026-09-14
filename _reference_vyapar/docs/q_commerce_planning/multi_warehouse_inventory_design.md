# Multi-Warehouse Inventory System Architecture

Systems like Shopify, Dukaan, and modern ERPs manage inventory across multiple locations (warehouses, retail stores, pop-up shops) using a decentralized inventory model. 

Currently, in your database, inventory is conceptualized globally (likely tied directly to the variant, or just via an `is_out_of_stock` flag). To move to a multi-warehouse system, the core principle is to **separate the "Product Variant" from its "Stock Quantity"**.

Here is how the underlying architecture, dynamic flows, and edge cases work in these platforms.

---

## 1. The Database Architecture (Schema)

To make inventory location-aware, you introduce a concept of "Locations" and map them to your variants.

### A. Locations Table
This table stores all physical (or virtual) places where stock is held.
```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., "Delhi Main Warehouse", "Connaught Place Store (POS)"
  type TEXT CHECK (type IN ('warehouse', 'store', 'supplier')),
  is_active BOOLEAN DEFAULT true,
  address JSONB -- Needed for distance calculations
);
```

### B. Inventory Levels Table (The Core)
Instead of keeping a `stock_quantity` column inside `product_variants`, you create a many-to-many relationship table. This allows a single variant to have different stock levels at different locations.

```sql
CREATE TABLE inventory_levels (
  id TEXT PRIMARY KEY,
  variant_id TEXT REFERENCES product_variants(id),
  location_id TEXT REFERENCES locations(id),
  
  -- The actual stock counts
  available INTEGER DEFAULT 0,  -- Stock available to sell
  committed INTEGER DEFAULT 0,  -- Stock ordered but not yet shipped
  
  UNIQUE(variant_id, location_id)
);
```
*If "Delhi Warehouse" has 50 units of whey protein, and "Mumbai Store" has 10 units, there will be two rows in this table for that single variant.*

---

## 2. Edge Cases and How Locations Interact

When you have multiple inventories, the system needs strict logic to handle edge cases, stockouts, and complex customer orders. Here is how the inventories interact dynamically:

### Edge Case A: One Location runs out of stock, but another has it
**Scenario:** A customer in Delhi wants to buy 1 unit of Whey Protein. 
- Delhi Warehouse `available` = 0
- Mumbai Warehouse `available` = 10

**How it works:** 
The online order routing algorithm checks the closest warehouse (Delhi) first. It sees `available = 0`, so it skips it. It then checks the next closest (Mumbai). Since Mumbai has stock, the order is routed to Mumbai. 
*Result:* Stock is committed from Mumbai. The customer gets their order, but shipping might take slightly longer. The customer is completely unaware of this background logic.

### Edge Case B: Partial Stock & Split Shipments (The hardest problem)
**Scenario:** A customer orders 5 units of Peanut Butter. 
- Delhi Warehouse `available` = 3
- Mumbai Warehouse `available` = 2
- Total Global Stock = 5 (Website allows the order).

**How it works:**
The routing algorithm realizes no single warehouse can fulfill the entire order. It must do a **Split Shipment**.
1. It commits 3 units from Delhi.
2. It commits 2 units from Mumbai.
3. The single customer order (`orders` table) will now have two separate sub-orders or packages (`fulfillments` or `shipments` table).
4. The customer receives two separate tracking links and two separate boxes arrive at their door on different days.

### Edge Case C: Concurrency and Race Conditions (Double Selling)
**Scenario:** There is exactly 1 unit left globally (in Delhi). Customer A and Customer B both add it to their cart and click "Pay Now" at the exact same millisecond.

**How it works:**
In a multi-warehouse setup, your database must use strict row-level locking (e.g., Supabase PostgreSQL `FOR UPDATE` lock) during the checkout process. 
1. The first transaction to hit the database locks the Delhi inventory row and commits the 1 unit.
2. The second transaction hits the database, waits for the lock, and then sees `available` is now 0. 
3. Customer B's checkout fails with an error: *"Sorry, this item just went out of stock"*, preventing a double-sale.

### Edge Case D: Returns to a different location
**Scenario:** A customer ordered an item online. It was shipped from the Delhi Warehouse. A week later, the customer walks into your physical retail store (POS) in Gurgaon and wants to return it.

**How it works:**
The inventory system doesn't care where it *came* from, only where it is *going*. 
When the POS staff processes the return, the stock is incremented to the `available` pool of the **Gurgaon Store**, not Delhi. Now, the Gurgaon store has +1 stock to sell locally.

### Edge Case E: POS "Phantom Stock" (Physical vs Digital Mismatch)
**Scenario:** A customer walks into a store with an item in hand. The POS system says `available = 0`, but the staff is holding it! (This happens due to theft, miscounting, or system lag).

**How it works:**
POS systems are designed not to block physical sales. If the staff scans it, the POS should either:
1. Allow the stock to go to `-1` (Negative Inventory), flagging it for an admin to investigate later.
2. Force the staff to do an immediate "Manual Stock Adjustment" (+1 to `available`) before the bill can be printed.

---

## 3. How it Works Dynamically (The Standard Flow)

### Scenario A: A POS (Point of Sale) Order
When your staff rings up a customer in a physical store, the POS system knows which `location_id` it belongs to.
1. Customer buys 2 units at the "Connaught Place Store".
2. The system directly queries `inventory_levels` where `location_id = 'connaught_place'`.
3. It immediately deducts 2 from `available` at that specific location.

### Scenario B: A Standard Online Order (Website)
When a customer orders online:
1. **Order Routing:** The system decides which location should fulfill the order based on proximity and availability.
2. **Committing Stock:** The system does **not** immediately deduct available stock. Instead, it moves stock from `available` to `committed`.
   - `available = available - 1`
   - `committed = committed + 1`
   *(Because the item is still physically sitting on the warehouse shelf until it is shipped).*
3. **Fulfillment (Shipping):** When the admin packs the box and marks the order as "Shipped":
   - The system reduces the `committed` stock by 1.
   - The item is now fully removed from the system.

---

## 4. Calculating "Total Global Stock"

When you display stock on the product page of your website (e.g., "Only 5 left in stock!"), you aggregate it dynamically across all locations.

```sql
-- How the website checks if a product is in stock:
SELECT SUM(available) as total_stock
FROM inventory_levels
WHERE variant_id = 'variant_123' 
AND location_id IN (SELECT id FROM locations WHERE is_active = true);
```

---

## 5. Hyper-Local & Dynamic Delivery Promises (Quick Commerce)

If you want to show dynamic delivery estimates based on the user's location, you are moving into **Quick Commerce (Q-Commerce) / Hyper-local** territory.

Crucially, **these promises (e.g., "30 Minutes", "2 Hours", "Same Day") are not hardcoded**. Because every seller has different logistics capabilities, they dynamically configure these rules in their Admin Settings.

Here is how to architect this feature:

### A. Updating the Database for Customizable Zones & Promises
Your `locations` table (or a new `delivery_zones` table) needs exact coordinates, delivery radii, AND the specific text promise the seller wants to show for that radius.

```sql
-- Enable PostGIS extension in Supabase
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE locations 
ADD COLUMN coordinates GEOGRAPHY(POINT), -- Lat/Lng of the warehouse/store

-- Seller configures these in their admin dashboard:
ADD COLUMN quick_delivery_radius_km DECIMAL(5,2) DEFAULT 5.0,
ADD COLUMN quick_delivery_promise TEXT DEFAULT 'Delivery in 30 Mins',

ADD COLUMN standard_delivery_radius_km DECIMAL(5,2) DEFAULT 50.0,
ADD COLUMN standard_delivery_promise TEXT DEFAULT 'Delivery in 24 Hours',

ADD COLUMN fallback_delivery_promise TEXT DEFAULT 'Standard 3-5 Days';
```
*(In a more advanced setup, sellers could create an unlimited number of concentric zones in a separate `delivery_zones` table, but the logic remains the same).*

### B. The Frontend Flow (User Location Request)
1. **Prompt for Location:** When the user opens the storefront, a prompt appears: "Allow location access to see fast delivery options" (or let them enter a pincode).
2. **Fetch Coordinates:** Use the browser's Geolocation API or an API like Google Maps to map the pincode to Lat/Lng.
3. **Send to Backend:** The frontend sends the user's Lat/Lng to your backend API.

### C. The Backend Logic (Dynamic Promise Calculation)
When the user views a product, your backend runs a spatial query to find the closest location *that has stock*, and returns the seller's custom text for that specific radius.

```sql
-- Example logic to find delivery promise based on distance
WITH UserLocation AS (
  SELECT ST_MakePoint(longitude, latitude)::geography AS geom -- User's location
)
SELECT 
  l.name,
  il.available,
  ST_Distance(l.coordinates, u.geom) / 1000 AS distance_km,
  CASE 
    WHEN ST_Distance(l.coordinates, u.geom) / 1000 <= l.quick_delivery_radius_km THEN l.quick_delivery_promise
    WHEN ST_Distance(l.coordinates, u.geom) / 1000 <= l.standard_delivery_radius_km THEN l.standard_delivery_promise
    ELSE l.fallback_delivery_promise
  END as delivery_promise_text
FROM locations l
JOIN inventory_levels il ON il.location_id = l.id
CROSS JOIN UserLocation u
WHERE il.variant_id = 'variant_123' AND il.available > 0
ORDER BY distance_km ASC
LIMIT 1;
```

### D. What Happens Dynamically?
1. **Inside the Zone:** If the user is 2km away from the "Connaught Place Store" and that store has stock, the query returns whatever the seller typed into `quick_delivery_promise` (e.g., "Lightning Fast 15 Min Delivery!"). 
2. **Outside the Zone (but nearby):** If the user is 20km away, the query returns the seller's `standard_delivery_promise`.
3. **Far Away (Fallback):** If the user is 500km away, the backend falls back to shipping from the Main Warehouse, returning `fallback_delivery_promise`.
4. **Out of Stock Locally, but In Stock Globally:** If the user is 2km from the Connaught store, but that store has `available = 0`, the query skips it. It finds the Delhi Main Warehouse (20km away) which has stock, and dynamically shows the standard promise instead of the quick one.

This ensures that the seller has total control over their promises in the Admin Panel, and the system never lies to the customer about delivery speed if the local store is out of stock.

---

## 6. Fulfillment Pipelines & The Rider App (Q-Commerce Delivery Flow)

If a seller enables a "Quick Commerce" zone, the fulfillment process completely changes. Instead of printing an AWB for a standard courier (like Delhivery), the order is routed to a Hyper-local Dispatch system.

### A. The "Enable Quick Commerce" Toggle
In the database, you add a toggle (boolean) to the `locations` or `delivery_zones` table:
```sql
ALTER TABLE locations 
ADD COLUMN is_qcommerce_enabled BOOLEAN DEFAULT false;
```

### B. Routing the Order to the Right Pipeline
When an order is paid for, the backend checks the fulfillment location:

**Pipeline 1: Standard Fulfillment (`is_qcommerce_enabled = false`)**
1. Order hits the seller's Admin Dashboard.
2. Seller clicks "Fulfill", prints an AWB (e.g., Shiprocket/Delhivery).
3. The customer receives a standard tracking link (e.g., `shiprocket.in/track/123`).

**Pipeline 2: Quick Commerce Fulfillment (`is_qcommerce_enabled = true`)**
1. The order bypasses the standard courier queue.
2. It hits a **Hyper-local Dispatch Queue** (or a 3rd party API like Dunzo, Shadowfax, or your own in-house Rider App API).
3. The order is assigned to a specific "Rider".
4. The database creates a `rider_assignments` row tracking the Rider's ID, Name, Phone, and live GPS coordinates.

### C. Live Tracking (The Rider Animation)
For Q-Commerce orders, you don't send a Shiprocket link. You build a live tracking UI in your app/website.

1. **WebSockets:** The Rider App constantly sends GPS coordinates (`lat`, `lng`) to your backend via WebSockets.
2. **Customer App:** The customer's "Track Order" page connects to the same WebSocket channel.
3. **The Animation:** As new coordinates stream in, the frontend (using Google Maps or Mapbox) animates a small motorcycle icon moving along the polyline path toward the customer's house.

This ensures that the "30-minute delivery" promise isn't just text on a screen—it's backed up by a dedicated fulfillment pipeline and a live-tracked rider!
