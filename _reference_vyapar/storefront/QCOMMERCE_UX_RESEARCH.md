# UX Research: Q-Commerce Home Page (Blinkit Style)

This document outlines the detailed UI/UX behavior and structure for the Storefront Home Page, strictly following the layout of leading quick-commerce apps.

## 1. Global Header Structure
The header is broken down into specific vertical blocks for maximum clarity.

### **Block 1: ETA & Location (Top-most)**
- **Delivery ETA:** The very first element at the top showing the delivery time (e.g., "Delivery in 10 minutes"). This is bold and highly visible.
- **Location Selector:** Positioned directly below or beside the ETA, allowing the user to tap and change their delivery address.

### **Block 2: Search & Actions**
- **Search Bar:** A prominent, slightly thick (tall) search input field.
- **Wishlist/Profile Icon:** Positioned immediately to the right of the search bar for quick access.

### **Scroll Behavior (Header Collapse)**
- **On Scroll Down:** As the user scrolls down the page, the **ETA and Location block completely hides/disappears** to maximize screen real estate for products. Only the Search Bar (and possibly the wishlist) remains sticky at the top, ensuring users can always search without scrolling back up.

## 2. Top Categories (Slidable Navigation)
Positioned just below the Search block, this is the primary category navigation.

### **Default State & Layout**
- **Horizontal Scroll (Slidable):** Instead of a wrapping grid, these categories are placed in a horizontal, swipeable row.
- **The "For You" / "All" Section:** The extreme left (first) item is always a dedicated "For You" or "All" tab.
- **Uniformity (Strict):** 
  - Every single category item takes the exact same space (same width and height).
  - The length of the text does not affect the container size; text is strictly truncated if it's too long.
- **Visuals (SVGs):** Instead of random images, these top categories use clean, uniform SVGs (Scalable Vector Graphics). This ensures a highly professional, consistent, and crisp look across all categories (e.g., a uniform outline style for Fresh, Fruits, Electronics).

### **Interaction & Edge Cases**
- **Active State:** The currently selected category (e.g., "For You") has a distinct visual indicator (like a bottom border, a different background color, or bold text).
- **Smooth Snapping:** When swiping left or right, the categories should smoothly snap into view.
- **Edge Case (No SVGs):** If an admin forgets to upload an SVG, the system must provide a default fallback SVG that perfectly matches the size of the others, ensuring the uniform look never breaks.

---
*Status: Research Phase. Implementation paused pending review.*
