# Cloudflare CDN Caching Setup Guide

This guide explains how to set up the origin-pull caching mechanism where media is uploaded to Supabase, but served through Cloudflare (with Vercel as a fallback).

## Overview
1. **Uploads:** Without R2 keys in settings, the system defaults to uploading files to the Supabase `products` bucket.
2. **Delivery (Caching):**
   - **Priority 1 (Cloudflare):** First time a file is requested, Cloudflare pulls it from Supabase. Subsequent requests are served from Cloudflare's edge cache (saving Supabase bandwidth).
   - **Priority 2 (Vercel Edge):** If Cloudflare is bypassed, Vercel's edge network proxies and caches the image.
   - **Priority 3 (Supabase):** Direct fallback if the CDNs fail.

---

## The Setup Process

### Step 1: Keep Admin Settings Empty
Ensure the **"Cloudflare R2 (Media Storage)"** fields in your Admin Settings remain empty. This tells the code to continue uploading to your Supabase bucket.

### Step 2: Configure Cloudflare DNS (The Cache)
Once you have added your domain to a Cloudflare account:
1. Log in to the Cloudflare dashboard.
2. Navigate to **DNS > Records**.
3. Create a new record:
   - **Type:** `CNAME`
   - **Name:** `cdn` *(or `media`)*
   - **Target:** `xgfikdhcudyixwbwlcuh.supabase.co` *(Your Supabase project URL)*
   - **Proxy Status:** 🟠 **Proxied** (Ensure the orange cloud is ON).
4. Save the record. *(Your CDN URL is now `https://cdn.yourdomain.com`)*.

### Step 3: Link in Vercel Environment Variables
1. Log in to Vercel and go to your project's **Settings > Environment Variables**.
2. Add the Cloudflare Variable:
   - **Key:** `PUBLIC_CLOUDFLARE_CDN_URL`
   - **Value:** `https://cdn.yourdomain.com`
3. Add the Vercel Fallback Variable:
   - **Key:** `PUBLIC_USE_VERCEL_CDN`
   - **Value:** `true`
4. Ensure these are checked for Production/Preview/Development and click **Save**.

### Step 4: Redeploy
1. Go to the **Deployments** tab in Vercel.
2. Click the three dots (`...`) next to your most recent deployment.
3. Click **Redeploy**.

Once the build finishes, all media will instantly begin routing through Cloudflare and Vercel's CDN, protecting your Supabase bandwidth limits.
