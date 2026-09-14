# Multitenant Platform API Documentation

This document provides a comprehensive list of all the APIs available in the platform, grouped by their functionality and module.

## 1. Storefront & Public APIs
These APIs are used by the customer-facing frontend to fetch data and track orders.
* **`api/products.ts`**: Fetches product catalog for the storefront.
* **`api/track-order.ts`**: Retrieves the current status of an order based on tracking ID.
* **`api/validate-coupon.ts`**: Public endpoint to check if a discount coupon is valid.
* **`api/storefront/delivery-promise.ts`**: Calculates estimated delivery time based on customer pincode.
* **`api/storefront/reviews.ts`**: Fetches product reviews to display on product pages.

## 2. Customer Account APIs (`/api/account/*`)
Used by customers for authentication and managing their profile.
* **`login.ts`**, **`logout.ts`**: Authenticates and logs out the customer.
* **`send-otp.ts`**, **`request-new-otp.ts`**, **`request-change-otp.ts`**, **`request-unlock-otp.ts`**, **`verify-unlock-otp.ts`**: Manages OTP sending and verification for login and profile changes.
* **`check-new-user.ts`**: Checks if an email/phone belongs to a new or existing user.
* **`addresses.ts`**, **`save-address.ts`**, **`delete-address.ts`**: Manages the customer's saved shipping addresses.
* **`update-profile.ts`**, **`confirm-change.ts`**: Updates user profile details (name, email, phone).
* **`cancel-order.ts`**: Allows a customer to request cancellation of an order.
* **`submit-review.ts`**: Submits a product review.

## 3. Cart & Checkout APIs (`/api/cart/*` & `/api/checkout/*`)
Handles shopping cart logic, discounts, and payment gateways.
* **Cart**:
  * **`cart/coupons.ts`**: Applies a coupon to the active cart.
  * **`cart/cross-sell.ts`**: Fetches cross-sell or upsell product recommendations for the cart.
  * **`cart/milestone.ts`**: Calculates rewards or free shipping based on cart value milestones.
  * **`cart/settings.ts`**: Retrieves store cart settings (e.g., minimum order value).
  * **`cart/stock.ts`**: Checks real-time inventory for items in the cart.
* **Checkout**:
  * **`checkout/validate.ts`**, **`checkout/validate-coupon.ts`**: Validates the cart and applied coupons before payment.
  * **`checkout/verify-pincode.ts`**: Checks if delivery is available at the provided pincode.
  * **`checkout/send-otp.ts`**, **`checkout/verify-otp.ts`**: OTP verification during checkout for guest users.
  * **`checkout/cod.ts`**: Processes Cash on Delivery orders.
  * **`checkout/zero.ts`**: Processes zero-value (free) orders.
  * **`checkout/pay-online.ts`**: Initializes online payment.
  * **`checkout/razorpay.ts`**, **`checkout/phonepe.ts`**: Payment gateway integrations for order creation.
  * **`checkout/phonepe-callback.ts`**, **`checkout/verify-payment.ts`**: Payment success/failure verification and callback handlers.

## 4. Admin Panel APIs (`/api/admin/*`)
Used by Store Owners and Admins to manage their specific store.
* **Authentication**: `login.ts`, `logout.ts`, `request-otp.ts`, `verify-otp.ts`, `password-recovery.ts`, `staff.ts`.
* **Products & Catalog**: `products.ts`, `categories.ts`, `products/batch-update-prices.ts`, `products/add-b2b-variant.ts`.
* **Orders & Fulfillments**: `update-order-status.ts`, `update-order-awb.ts`, `create-manual-order.ts`, `invoice.ts`.
* **Fulfillment sub-routes**: `fulfillments/[id]/assign-rider.ts`, `dispatch-3pl.ts`, `update-awb.ts`, `update-status.ts`.
* **Marketing & Discounts**: `coupons.ts`, `save-coupon.ts`, `flash-sales.ts`, `generate-flash-sale.ts`.
* **Customers & Feedback**: `reviews.ts`, `feedback.ts`.
* **Bulk Operations**: `bulk_upload.ts`, `bulk_upload_blog.ts`, `bulk_upload_coupons.ts`, `bulk_upload_customers.ts`, `bulk_upload_feedback.ts`, `bulk_upload_reviews.ts`, `export.ts`, `export-catalog.ts`.
* **Store Management & Settings**: `settings.ts`, `update-settings.ts`, `locations.ts`, `shipping.ts`, `domains.ts`, `update-domain.ts`, `domains/sync.ts`, `recharge-wallet.ts`.
* **AI & Content Generation**: `ai-assistant.ts`, `generate-ai.ts`, `generate-hero.ts`, `generate-listing.ts`, `save-blog-post.ts`.
* **Marketplace & Services**: `marketplace-apply.ts`, `marketplace-action.ts`, `request-marketplace-listing.ts`, `request-mobile-app.ts`, `request-service.ts`.
* **Delivery/Riders**: `riders.ts`, `assign-rider.ts`, `update-rider-status.ts`.
* **Others**: `notifications/mark-read.ts`, `payouts/process.ts`, `inventory.ts`, `inventory-transfer.ts`.

## 5. Super Admin APIs (`/api/super-admin/*`)
Used by platform owners to manage the multi-tenant SaaS platform.
* **Store Provisioning**: `provision-store.ts`, `kyc-review.ts`, `approve-marketplace-listing.ts`, `store-action.ts`.
* **Billing & Payouts**: `plans.ts`, `process-payout.ts`, `process-recharge.ts`.
* **Platform Config**: `update-platform-settings.ts`, `update-service.ts`, `update-master-password.ts`.
* **Access & Impersonation**: `logout.ts`, `rbac.ts`, `impersonate.ts` (Login as any store owner).

## 6. Affiliate APIs (`/api/affiliate/*`)
Used by influencers/partners driving sales.
* **`check-offer.ts`**: Checks if an affiliate offer is valid.
* **`profile.ts`**: Gets or updates the affiliate's profile.
* **`withdraw.ts`**: Requests payout for affiliate earnings.
* **`verify-otp.ts`**, **`logout.ts`**: Authentication for affiliate panel.

## 7. Rider App APIs (`/api/rider/*`)
Used by delivery personnel (Q-commerce/hyperlocal).
* **`login.ts`**, **`logout.ts`**, **`send-otp.ts`**, **`verify-otp.ts`**: Rider authentication.
* **`pending-deliveries.ts`**: Fetches orders assigned to the rider.
* **`update-location.ts`**: Pushes live GPS coordinates for tracking.
* **`update-order-status.ts`**, **`update-status.ts`**: Marks orders as picked up, dispatched, or delivered.

## 8. Webhooks & Cron Jobs
* **Webhooks (`/api/webhooks/*`)**: Receives callbacks from external services: `razorpay.ts` (payments), `dunzo.ts`, `shadowfax.ts`, `icarry.ts` (3PL delivery updates).
* **Cron (`/api/cron/*`)**: Scheduled background tasks: `abandoned-carts.ts` (sends recovery emails/SMS), `auto-assign.ts` (assigns riders to new orders automatically), `billing.ts` (SaaS subscription billing).
* **Tracking (`/api/tracking/live.ts`)**: Streams live rider location to the customer.
