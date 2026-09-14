# Product Requirements Document (PRD): VyaparPe Quick Commerce

## 1. Product Vision
To empower VyaparPe sellers to operate sophisticated multi-warehouse logistics and 30-minute Quick Commerce delivery, without forcing complexity onto small sellers who only need standard e-commerce features.

## 2. Core Features & Capabilities

### Feature 1: Multi-Warehouse Inventory
* Sellers can add multiple locations (Warehouses, Physical Stores, Dark Stores).
* Inventory is tracked at the `(Variant, Location)` level, not just globally.
* The system automatically routes orders to the warehouse nearest to the customer's pincode.

### Feature 2: Quick Commerce Zones & Dynamic Delivery Promise
* Sellers can define a "Q-Commerce Zone" for each warehouse using either a **Radius (e.g., 3km)** or a **List of Pincodes**.
* **Dynamic Customer UI:** 
  * If a customer's location is inside the zone AND the local warehouse has stock: UI shows `"Get it in 30 mins ⚡"`.
  * If the customer is outside the zone OR the local warehouse is out of stock (but a regional one has it): UI falls back to `"Standard Delivery (2-3 Days) 🚚"`.

### Feature 3: Split Shipments
* If a customer orders two items, and they are located in two different warehouses, the system automatically splits the order into two separate fulfillments (AWBs).
* The customer pays a **single shipping fee** at checkout. The seller's wallet absorbs the cost of the split shipment.

### Feature 4: Opt-In Safety (Feature Flags)
* By default, all stores operate as single-warehouse e-commerce setups (100% backward compatible).
* Sellers must explicitly toggle `Enable Multi-Location Fulfillment` and `Enable Quick Commerce` in their Admin Panel to activate the new routing engine.

## 3. User Stories

### Customer (Shopper)
* *As a customer, I want to see accurate delivery time estimates before I add an item to my cart, so I know if I can get it immediately.*
* *As a customer, I want to pay only one shipping fee even if my order comes in two different boxes.*
* *As a customer, I want to see my quick commerce rider moving on a live map so I know exactly when to go to the door.*

### Seller (Merchant)
* *As a seller, I want to manage stock across my Delhi and Mumbai warehouses separately so I stop getting out-of-stock cancellations.*
* *As a local grocer, I want to assign orders to my own delivery boy and let the customer track him for free on OpenStreetMap.*
* *As a small seller, I don't want to see confusing warehouse options because I only ship from my bedroom.*

## 4. UI/UX Requirements
* **Admin Dashboard:** New sidebar menu `Location & Fulfillment` for managing zones, stock, and live rider tracking.
* **Storefront:** Badges on Product Cards and Cart for ETA (Q-Commerce vs Standard).
* **Tracking Page:** A full-screen map (Google/OSM toggle) showing rider location via WebSockets.

## 5. Technical Infrastructure & Cron Jobs
### Rider Auto-Assign Cron Job
To facilitate 30-minute quick commerce, the system relies on a background task (Cron Job) that runs every 1 minute. This task polls for pending orders and automatically assigns them to the nearest available active rider.
* **API Endpoint:** `/api/cron/auto-assign`
* **Schedule:** `* * * * *` (Every minute)

### Deployment Constraints (Vercel)
* **Vercel Hobby Plan (Free):** Limited to only 1 daily cron job (e.g., `0 0 * * *`). Setting a per-minute cron job will cause Vercel deployments to fail completely.
* **Workaround for Free Tier:** Remove the `crons` block from `vercel.json` to allow deployments. Use a free external service like [cron-job.org](https://cron-job.org/) to HTTP GET the `/api/cron/auto-assign` endpoint every minute. This replicates Vercel's cron functionality at exactly ₹0 cost.
* **Vercel Pro Plan ($20/mo):** Allows up to 40 cron jobs per project, including per-minute resolutions. (Not recommended if the sole purpose is triggering this single endpoint).
