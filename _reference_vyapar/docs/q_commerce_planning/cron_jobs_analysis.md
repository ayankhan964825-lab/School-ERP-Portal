# Comprehensive Cron Job Analysis for VyaparPe

Based on the architecture of the VyaparPe platform (Multi-tenant, Q-Commerce, Affiliate system, and SaaS features), here is a detailed breakdown of where background cron jobs will be required. 

I have categorized them by their required execution frequency and their business impact.

---

## 1. High Frequency (Every 1 - 5 Minutes)
These jobs require near real-time execution and are critical for operational efficiency, especially for the Q-commerce engine.

*   **Rider Auto-Assign (Q-Commerce):**
    *   **Purpose:** Scans the database for new pending Q-commerce orders and automatically assigns them to the nearest available active rider.
    *   **Frequency:** Every 1 minute (`* * * * *`).
*   **Order Acceptance Timeout (SLA Breach):**
    *   **Purpose:** If an assigned rider does not accept an order within 3 minutes, the system should re-assign it to the next rider or alert the admin.
    *   **Frequency:** Every 1 minute.
*   **Payment Gateway Status Sync:**
    *   **Purpose:** For orders where the customer dropped off or the webhook failed, this cron pings Razorpay/PhonePe to verify the payment status of "Pending Payment" orders.
    *   **Frequency:** Every 5 minutes.

## 2. Medium Frequency (Hourly)
These jobs handle marketing automation and B2B synchronizations.

*   **Abandoned Cart Recovery:**
    *   **Purpose:** Identifies shopping carts that have been inactive for more than 4 hours and automatically triggers a recovery Email or WhatsApp message to the customer.
    *   **Frequency:** Hourly (`0 * * * *`).
*   **Flash Sale Activation/Deactivation:**
    *   **Purpose:** Automatically changes the status of products on Flash Sale based on the `start_time` and `end_time` set by the store admin.
    *   **Frequency:** Hourly or every 15 minutes.
*   **B2B Inventory Sync:**
    *   **Purpose:** For large sellers who sync their inventory from external ERPs (like Tally or Zoho), an hourly background sync keeps their warehouse stock updated.
    *   **Frequency:** Hourly.

## 3. Low Frequency (Daily - Midnight to 3 AM)
These jobs are heavy batch processes for financials, reporting, and database cleanup. They should run during off-peak hours (e.g., 2:00 AM) to avoid slowing down the database.

### Financials & Wallets
*   **Affiliate Commission Clearance:**
    *   **Purpose:** Affiliates earn commission on sales, but the money should remain "Pending" until the customer's 7-day return window expires. This daily cron moves pending funds to the "Available for Withdrawal" wallet.
    *   **Frequency:** Daily at Midnight (`0 0 * * *`).
*   **Rider Daily Earnings Settlement:**
    *   **Purpose:** Calculates the total deliveries a rider made today, adds tips, and updates their main wallet balance for payout.
    *   **Frequency:** Daily at Midnight.

### Reporting & Alerts
*   **Low Stock Alerts (Inventory):**
    *   **Purpose:** Scans all warehouses and sends a daily digest email to store owners listing which products are below their minimum reorder threshold.
    *   **Frequency:** Daily at 8:00 AM (`0 8 * * *`).
*   **SaaS Subscription Renewals / Expiry:**
    *   **Purpose:** For VyaparPe's own billing. Checks which stores have their ₹1500/month subscription expiring today and triggers invoices or downgrades them to a free tier.
    *   **Frequency:** Daily at Midnight.

### Database Optimization & Cleanup
*   **Unlinked Uploads Cleanup:**
    *   **Purpose:** Deletes images/videos from AWS/Cloudinary that were uploaded but never linked to a product or blog post (saves storage costs).
    *   **Frequency:** Daily at 2:00 AM.
*   **Expired OTP & Session Cleanup:**
    *   **Purpose:** Removes expired JWTs, OTPs, and password recovery tokens from the database to keep tables small and fast.
    *   **Frequency:** Daily at 3:00 AM.
*   **Orphaned Carts Deletion:**
    *   **Purpose:** Deletes guest shopping carts that are older than 15 days.
    *   **Frequency:** Weekly (`0 4 * * 0`).
*   **Activity Logs Trimming:**
    *   **Purpose:** Deletes admin activity logs older than 90 days to prevent the `activity_logs` table from bloating into gigabytes.
    *   **Frequency:** Weekly.

---

### Summary for Vercel Quota
If you use a tool like **cron-job.org**, you can set up all of these endpoints individually for free. 
If you ever move to Vercel Pro, their limit of 40 cron jobs is more than enough because you only need **about 10-12 cron jobs in total** to run this entire multi-tenant platform at scale.
