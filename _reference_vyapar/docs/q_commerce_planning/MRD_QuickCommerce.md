# Market Requirements Document (MRD): VyaparPe Quick Commerce

## 1. Executive Summary
VyaparPe is upgrading its core e-commerce architecture to support **Multi-Warehouse Inventory** and **Hyper-local Quick Commerce (Q-Commerce)**. This positions VyaparPe not just as a Shopify competitor, but as a white-label Swiggy/Zepto alternative for D2C brands, grocers, and pharmacies.

## 2. Target Market & Audience
* **Tier 1 (Enterprise/D2C Brands):** Sellers with multiple warehouses across India who need intelligent, proximity-based order routing to reduce shipping costs.
* **Tier 2 (Local Grocers & Pharmacies):** Hyper-local businesses that want to offer 10-30 minute delivery to their neighborhood without paying 30% commissions to aggregators like Swiggy/Zomato.
* **Tier 3 (Small E-commerce Sellers):** Standard sellers who ship via national couriers (Delhivery/BlueDart) and do not need Q-Commerce. (The system remains 100% backward compatible for them).

## 3. The Problem Statement
1. **High Aggregator Commissions:** Sellers pay 25-30% to Swiggy Minis or Zomato for hyper-local delivery.
2. **SaaS Infrastructure Costs:** Live tracking maps (Google Maps) cost $7 per 1,000 loads. For a SaaS platform like VyaparPe, absorbing this cost for thousands of sellers would bankrupt the platform.
3. **Inventory Fragmentation:** Existing platforms struggle to elegantly route split shipments when a customer's cart contains items from two different warehouses.

## 4. The VyaparPe Solution & Value Proposition
* **The "Zero-Cost" Map Strategy:** We offer **OpenStreetMap (OSM) + Leaflet** as a 100% free live-tracking map for sellers. If a premium seller wants Google Maps 3D tracking, they use a **Bring Your Own Key (BYOK)** model. *VyaparPe's map API cost remains ₹0.*
* **Hybrid Fulfillment Options:** Sellers can push orders to Dunzo/Shadowfax (3rd-party logistics) OR assign them to their own staff via the VyaparPe In-House Rider App.
* **Opt-In Architecture:** The entire Q-Commerce engine is feature-flagged. Small sellers default to standard e-commerce, ensuring no UX friction for the bottom of the pyramid.

## 5. Competitive Advantage
Unlike Shopify (which requires expensive plugins for local delivery) or Swiggy (which owns the customer data and charges high fees), VyaparPe offers a native, white-labeled Q-Commerce engine where the seller owns the customer and controls the delivery fleet, with zero platform API overhead.
