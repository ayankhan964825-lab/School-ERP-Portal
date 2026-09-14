# Comprehensive API & Feature Audit Checklist

This document serves as a master checklist for conducting a complete audit of all platform APIs and their correlated features (UI, UX, frontend interactions, and backend logic).

## 1. Storefront & Public APIs
- [ ] `api/products.ts` (Product catalog fetching, UI/UX of product listing)
- [ ] `api/track-order.ts` (Order tracking logic and customer-facing tracking page)
- [ ] `api/validate-coupon.ts` (Public coupon validation and frontend error handling)
- [ ] `api/storefront/delivery-promise.ts` (Estimated delivery calculation and UI display)
- [ ] `api/storefront/reviews.ts` (Product reviews fetching and UI presentation)

## 2. Customer Account APIs (`/api/account/*`)
- [ ] `login.ts` (Authentication flow, login UI, error states)
- [ ] `logout.ts` (Session termination, redirection UX)
- [ ] `send-otp.ts` (OTP dispatch, rate limiting, UI feedback)
- [ ] `request-new-otp.ts` (Resend OTP functionality)
- [ ] `request-change-otp.ts` (OTP for changing sensitive profile info)
- [ ] `request-unlock-otp.ts` (OTP to unlock locked accounts)
- [ ] `verify-unlock-otp.ts` (Verification of account unlock)
- [ ] `check-new-user.ts` (User existence check during onboarding)
- [ ] `addresses.ts` (Fetching saved addresses, address book UI)
- [ ] `save-address.ts` (Adding/editing address, form validation UX)
- [ ] `delete-address.ts` (Address deletion, confirmation modals)
- [ ] `update-profile.ts` (Profile form submission, UI validation)
- [ ] `confirm-change.ts` (Confirming profile updates)
- [ ] `cancel-order.ts` (Order cancellation flow, eligibility checks)
- [ ] `submit-review.ts` (Review submission form, star rating UX)

## 3. Cart & Checkout APIs (`/api/cart/*` & `/api/checkout/*`)
**Cart module:**
- [ ] `cart/coupons.ts` (Applying/removing coupons in cart UI)
- [ ] `cart/cross-sell.ts` (Displaying cross-sell recommendations)
- [ ] `cart/milestone.ts` (Milestone progress bar UX, reward calculation)
- [ ] `cart/settings.ts` (Cart limits, minimum order value enforcement)
- [ ] `cart/stock.ts` (Real-time stock validation, out-of-stock UI states)

**Checkout module:**
- [ ] `checkout/validate.ts` (Pre-checkout validation checks)
- [ ] `checkout/validate-coupon.ts` (Final coupon re-validation)
- [ ] `checkout/verify-pincode.ts` (Serviceable area check UX)
- [ ] `checkout/send-otp.ts` (Guest checkout OTP flow)
- [ ] `checkout/verify-otp.ts` (Guest checkout verification)
- [ ] `checkout/cod.ts` (Cash on delivery processing and confirmation UX)
- [ ] `checkout/zero.ts` (Free order processing bypass)
- [ ] `checkout/pay-online.ts` (Payment gateway initialization UI)
- [ ] `checkout/razorpay.ts` (Razorpay integration and modal)
- [ ] `checkout/phonepe.ts` (PhonePe integration and redirect)
- [ ] `checkout/phonepe-callback.ts` (PhonePe server-to-server callback)
- [ ] `checkout/verify-payment.ts` (Payment success/failure UI redirection)

## 4. Admin Panel APIs (`/api/admin/*`)
**Authentication & Access:**
- [ ] `login.ts`, `logout.ts` (Admin login flow, session management)
- [ ] `request-otp.ts`, `verify-otp.ts` (2FA/OTP for admins)
- [ ] `password-recovery.ts` (Forgot password flow UX)
- [ ] `staff.ts` (Staff management, role assignment UI)

**Products & Catalog:**
- [ ] `products.ts` (Product listing, creation, editing UI)
- [ ] `categories.ts` (Category management, tree view UX)
- [ ] `products/batch-update-prices.ts` (Bulk pricing update tools)
- [ ] `products/add-b2b-variant.ts` (B2B variant management)

**Orders & Fulfillments:**
- [ ] `update-order-status.ts` (Order state machine, status change UI)
- [ ] `update-order-awb.ts` (AWB assignment)
- [ ] `create-manual-order.ts` (POS/Manual order creation form)
- [ ] `invoice.ts` (Invoice generation and PDF download UX)
- [ ] `fulfillments/[id]/assign-rider.ts` (Rider assignment modal)
- [ ] `fulfillments/[id]/dispatch-3pl.ts` (3PL integration logic)
- [ ] `fulfillments/[id]/update-awb.ts` (Fulfillment AWB update)
- [ ] `fulfillments/[id]/update-status.ts` (Fulfillment tracking)

**Marketing & Discounts:**
- [ ] `coupons.ts`, `save-coupon.ts` (Coupon creation, complex rules UI)
- [ ] `flash-sales.ts`, `generate-flash-sale.ts` (Flash sale management)

**Customers & Feedback:**
- [ ] `reviews.ts` (Review moderation UI)
- [ ] `feedback.ts` (Store feedback collection)

**Bulk Operations:**
- [ ] `bulk_upload.ts`, `bulk_upload_blog.ts`, `bulk_upload_coupons.ts` (CSV upload, error reporting UX)
- [ ] `bulk_upload_customers.ts`, `bulk_upload_feedback.ts`, `bulk_upload_reviews.ts` (Data import tools)
- [ ] `export.ts`, `export-catalog.ts` (Data export and download UX)

**Store Management & Settings:**
- [ ] `settings.ts`, `update-settings.ts` (Store configuration forms)
- [ ] `locations.ts` (Store locations and pickup points)
- [ ] `shipping.ts` (Shipping rules and rates UI)
- [ ] `domains.ts`, `update-domain.ts`, `domains/sync.ts` (Custom domain management)
- [ ] `recharge-wallet.ts` (Wallet recharge flow for SMS/Email credits)

**AI & Content Generation:**
- [ ] `ai-assistant.ts`, `generate-ai.ts` (AI assistant chat UI)
- [ ] `generate-hero.ts`, `generate-listing.ts` (AI content generation tools)
- [ ] `save-blog-post.ts` (Blog editor and publishing flow)

**Marketplace & Services:**
- [ ] `marketplace-apply.ts`, `marketplace-action.ts` (Marketplace application flow)
- [ ] `request-marketplace-listing.ts` (Listing request UI)
- [ ] `request-mobile-app.ts`, `request-service.ts` (Value-added service requests)

**Delivery/Riders & Others:**
- [ ] `riders.ts`, `assign-rider.ts`, `update-rider-status.ts` (Fleet management)
- [ ] `notifications/mark-read.ts` (Notification bell UX)
- [ ] `payouts/process.ts` (Store payout processing)
- [ ] `inventory.ts`, `inventory-transfer.ts` (Stock management and transfers)

## 5. Super Admin APIs (`/api/super-admin/*`)
- [ ] `provision-store.ts` (New tenant onboarding flow)
- [ ] `kyc-review.ts` (KYC document verification UI)
- [ ] `approve-marketplace-listing.ts` (Marketplace approval queue)
- [ ] `store-action.ts` (Suspend/activate stores)
- [ ] `plans.ts` (Subscription plan management)
- [ ] `process-payout.ts`, `process-recharge.ts` (Global financial operations)
- [ ] `update-platform-settings.ts`, `update-service.ts`, `update-master-password.ts` (Platform configuration)
- [ ] `logout.ts`, `rbac.ts` (Super admin access control)
- [ ] `impersonate.ts` (Impersonation banner and session override UX)

## 6. Affiliate APIs (`/api/affiliate/*`)
- [ ] `check-offer.ts` (Offer validation logic)
- [ ] `profile.ts` (Affiliate dashboard and profile)
- [ ] `withdraw.ts` (Commission withdrawal request UX)
- [ ] `verify-otp.ts`, `logout.ts` (Affiliate auth flow)

## 7. Rider App APIs (`/api/rider/*`)
- [ ] `login.ts`, `logout.ts`, `send-otp.ts`, `verify-otp.ts` (Mobile-optimized auth flow)
- [ ] `pending-deliveries.ts` (Task list UI for riders)
- [ ] `update-location.ts` (Background location tracking logic)
- [ ] `update-order-status.ts`, `update-status.ts` (Proof of delivery, status toggles)

## 8. Webhooks & Cron Jobs
- [ ] Webhooks (`razorpay.ts`, `dunzo.ts`, `shadowfax.ts`, `icarry.ts`) (Third-party callback handling and security verification)
- [ ] Cron (`abandoned-carts.ts`, `auto-assign.ts`, `billing.ts`) (Automated background task logic and logging)
- [ ] Tracking (`tracking/live.ts`) (WebSocket/Polling for live map UI)
