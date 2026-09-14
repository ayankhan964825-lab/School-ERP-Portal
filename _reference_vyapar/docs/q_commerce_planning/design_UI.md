# UI & Design Implementation Plan

This document details exactly what files and components will be built or modified in the frontend (Admin Panel & Storefront) to support Multi-Warehouse and Q-Commerce.

---

## 1. Admin Panel UI Changes

### A. New Page: `src/pages/admin/locations/index.astro`
* **Purpose:** A completely new page in the sidebar named "Locations & Fulfillment".
* **UI Elements:**
  * A table listing all active warehouses/stores.
  * An "Add Location" modal: Collects Name, Address, City, Pincode.
  * A "Q-Commerce Settings" section per location:
    * Toggle: "Enable Quick Commerce for this location"
    * Dropdown: "Zone Type" (Radius vs Pincodes)
    * Input: "Radius (km)" or "Comma-separated Pincodes"

### B. Modified Page: `src/pages/admin/inventory.astro`
* **Purpose:** Update the existing inventory page to handle multi-location stock.
* **UI Elements:**
  * Add a "Select Warehouse" dropdown at the top of the inventory table.
  * Instead of just editing `variant.stock`, the seller selects "Delhi Warehouse", and edits the `inventory_levels` for that specific location.

### C. Modified Page: `src/pages/admin/orders/[orderId].astro`
* **Purpose:** Show split shipments clearly.
* **UI Elements:**
  * Currently, there is one "Shipping/Dispatch" section. We will replace this with a **Fulfillments Loop**.
  * If an order is split into 2, it will show two separate boxes:
    * **Fulfillment 1 (from Delhi):** Contains Item A. Has its own "Generate AWB" button.
    * **Fulfillment 2 (from Mumbai):** Contains Item B. Has its own "Generate AWB" button.

### D. Modified Page: `src/pages/admin/website/configuration.astro` (or Settings)
* **Purpose:** The global opt-in feature flags.
* **UI Elements:**
  * Toggle: `Enable Multi-Location Fulfillment`
  * Toggle: `Enable Quick Commerce Features`
  * Dropdown: `Q-Commerce Map Provider` (OpenStreetMap [Free] vs Google Maps [BYOK])

---

## 2. Storefront UI Changes (Customer Facing)

### A. Modified Component: `src/components/ProductCard.astro` & `src/pages/products/[slug].astro`
* **Purpose:** Dynamic Delivery Promise Badges.
* **UI Elements:**
  * An API call to `/api/storefront/delivery-promise` runs on page load (passing the user's pincode/GPS).
  * If Q-Commerce eligible: Renders a highly visible badge `<span class="bg-green-100 text-green-800">⚡ Get it in 30 mins</span>`.
  * If standard eligible: Renders `<span class="bg-gray-100 text-gray-800">🚚 Standard Delivery (2-3 Days)</span>`.

### B. Modified Component: `src/components/react/CartDrawer.tsx`
* **Purpose:** Cart Stock Validation.
* **UI Elements:**
  * The "Only X left in stock!" red text will now reflect the real-time stock from `inventory_levels` instead of the legacy `product_variants.stock` table.

### C. New/Modified Page: `src/pages/tracking/[awb].astro`
* **Purpose:** The Live Rider Tracking UI.
* **UI Elements:**
  * If the AWB belongs to a standard courier (iCarry), it shows the standard timeline (Shipped -> In Transit -> Delivered).
  * If the AWB belongs to an In-House Rider (Q-Commerce):
    * The UI renders a full-width Map component (using `react-leaflet` for OpenStreetMap).
    * Subscribes to Supabase Realtime channel `rider_gps_[awb]`.
    * A motorcycle icon smoothly animates across the map towards the customer's home icon.
