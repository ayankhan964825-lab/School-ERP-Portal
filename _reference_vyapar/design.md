# VyaparPe — System & UI Design Document

> **Version:** 2.0 (Multi-Tenant SaaS + Marketplace)
> **Last Updated:** 2026-06-14

---

## 1. UI Architecture

VyaparPe consists of three distinct User Interfaces:

### 1.1 Super Admin Dashboard (`admin.vyaparpe.com`)
*For VyaparPe Internal Team*
- **Theme:** Professional, dense data tables, dark mode capable.
- **Key Views:**
  - **Global Overview:** Total MRR, Gross Merchandise Value (GMV), Total Stores.
  - **Store Manager:** List of all tenants, one-click "Create Store", suspend toggles.
  - **Marketplace Approvals:** Queue for reviewing seller KYC and product listings.
  - **Payouts Dashboard:** Approving wallet withdrawals.
  - **Domain Manager:** Monitoring Vercel DNS statuses.

### 1.2 Tenant Admin Dashboard (`mystore.com/admin`)
*For Sellers/Store Owners*
- **Theme:** Clean, approachable, focused on actionable metrics.
- **Key Views:**
  - **Dashboard:** Today's sales, pending orders, wallet balance.
  - **Wallet Ledger:** Similar to a bank passbook (credits, commissions, shipping deductions).
  - **Marketplace Hub:** Apply for KYC, select products to list on `vyaparpe.com`.
  - **Theme Editor:** Visual editor for changing colors, fonts, and layouts (Premium only).
  - **Domain Settings:** Input field for custom domain + CNAME instructions.

### 1.3 Storefronts (Customer Facing)
- **Seller Storefronts (`mystore.com`):** Highly customizable based on the `theme_config`. Fully branded to the seller. No VyaparPe branding (except "Powered by VyaparPe" footer on free plans).
- **Marketplace Storefront (`vyaparpe.com`):** Amazon-style layout. Search bar prominent. "Fulfilled by VyaparPe" badges. Generic seller display names.

---

## 2. Theming Engine (Design System)

The core challenge of a multi-tenant SaaS is allowing diverse designs from a single codebase.

### 2.1 CSS Variable Injection
Instead of hardcoding Tailwind classes like `text-green-600`, we use semantic variables:
```css
/* Injected dynamically by Astro based on store's theme_config */
:root {
  --theme-primary: #FF5722;
  --theme-secondary: #212121;
  --theme-accent: #FFC107;
  --theme-surface: #FFFFFF;
  --theme-text: #333333;
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

### 2.2 Component Variations
Components adapt based on theme settings:

```tsx
// Example: Product Card variants
const ProductCard = ({ product, style }) => {
  if (style === 'minimal') return <MinimalCard product={product} />;
  if (style === 'luxury') return <LuxuryCard product={product} />;
  return <DefaultCard product={product} />; // rounded with shadow
}
```

### 2.3 Base Themes Available

1. **Default (E-commerce Classic)**
   - Rounded corners, clear shadows, distinct primary colored buttons.
2. **Minimal (Fashion/Apparel)**
   - Sharp corners, lots of whitespace, thin borders, monochrome primary.
3. **Luxury (Jewelry/Premium)**
   - Dark mode default, serif headings, gold/metallic accents, subtle fade-ins.
4. **Food & Beverage**
   - Warm tones (orange/red/yellow), very rounded elements, playful typography.

---

## 3. Component Hierarchy (Storefront)

```
StoreLayout
 ├── GlobalHead (injects fonts & CSS vars)
 ├── Navbar (variant based on theme_config.navbar_style)
 │    ├── Logo (from store.logo_url)
 │    ├── SearchBar
 │    └── CartIcon
 ├── MainContent
 │    ├── HeroSection (variant: slider / banner / split)
 │    ├── CategoryGrid
 │    └── ProductGrid
 │         └── ProductCard (variant: default / minimal / luxury)
 └── Footer (variant based on theme_config.footer_style)
```

---

## 4. User Experience (UX) Flows

### 4.1 Seller Onboarding (Frictionless)
1. **Enter Phone Number:** Receive OTP.
2. **Name Your Store:** "What's your brand name?"
3. **Pick a Theme:** Show 4 visual thumbnails.
4. **Done!** Store is live at `brand.vyaparpe.com`. 
   *(No password creation, no email verification, no complex setups).*

### 4.2 Custom Domain Setup
1. Seller enters `mybrand.com`.
2. UI displays a clear, large box: 
   `Add CNAME Record | Host: @ | Value: cname.vercel-dns.com`
3. Seller clicks "I have added this".
4. UI shows a spinner. Backend polls Vercel. 
5. If successful: Confetti animation + "Domain Linked!".
6. If failed: "We couldn't verify this yet. DNS can take up to 24 hours."

### 4.3 Marketplace Purchase
1. Customer adds 2 items from Seller A and 1 item from Seller B to cart.
2. Checkout shows: "Items dispatched separately".
3. Customer completes payment (e.g., ₹1500).
4. Success screen shows two separate order IDs.

---

## 5. Responsive Design Strategy

- **Mobile-First:** >80% of Indian e-commerce traffic is mobile.
- **Bottom Navigation:** On mobile, critical actions (Home, Categories, Cart, Profile) are anchored to the bottom of the screen.
- **Touch Targets:** Minimum 44x44px for all buttons and links.
- **Image Optimization:** Astro's `<Image />` component used heavily. WebP format, lazy loaded below the fold.

---

## 6. Accessibility (a11y)

- All theme color combinations must be validated for contrast ratios (WCAG AA). If a seller picks yellow text on white, the UI will show a warning in the Theme Editor.
- ARIA labels on all icon-only buttons (Cart, Search, Menu).
- Keyboard navigation supported through the checkout flow.
