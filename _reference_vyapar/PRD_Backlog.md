# PRD & TRD: Future Implementations Backlog

## Feature 1: Platform White-Labeling (Supabase & Vercel)

### Overview
The goal of this feature is to completely white-label the SaaS platform so that end-users (sellers and their customers) cannot detect that the underlying infrastructure relies on Vercel and Supabase. This applies to domain verification, API endpoints, HTTP headers, and image URLs.

### Requirements

#### 1. Hide Supabase Footprints
- **Image URLs**: Uploaded images (e.g., in the Admin Panel or Storefront) currently expose the `*.supabase.co` URL.
  - *Solution*: Implement a media proxy endpoint (e.g., `/api/media/[...path]`). The frontend and admin panels should serve images through this custom endpoint rather than directly pointing to the Supabase Storage public URL.
- **Client-Side Supabase Access**: Components like `track-order.astro` use `@supabase/supabase-js` directly on the client, exposing the Supabase project URL and Anon Key in the browser's Network tab.
  - *Solution*: Convert client-side subscriptions to API polling via the Vercel backend, or implement a Cloudflare Worker reverse proxy to mask the Supabase endpoint.

#### 2. Hide Vercel Footprints
- **Domain Verification**: Vercel requires tenants to point their custom domains to `cname.vercel-dns.com` or `76.76.21.21`.
  - *Solution*: The platform owner will set up a white-labeled CNAME (e.g., `domains.vyaparpe.com`) pointing to Vercel's DNS. Tenants will be instructed to point their domains to `domains.vyaparpe.com`, masking the Vercel association.
- **HTTP Headers**: Vercel injects headers such as `x-vercel-id` and `server: Vercel`.
  - *Solution*: Use Vercel's Enterprise/Advanced settings to remove the "Powered by" headers, or use Cloudflare in front of the application to overwrite the `server` header.

---

## Feature 2: Global API Keys Fallback (Super Admin)

### Overview
The goal is to allow the Master Admin (Super Admin) to configure global API keys (e.g., Gemini AI, iCarry Delivery). 
If an individual tenant store hasn't configured their own API keys, the system will seamlessly fall back to these global keys, ensuring features like AI generation and shipping rate calculation always work out of the box.

### Proposed Changes

#### 1. Database Schema Update (Migration)
Create a new migration file `migration_v18_global_api_keys.sql` to add the following columns to the `platform_settings` table:
- `gemini_api_key` (TEXT)
- `icarry_api_key` (TEXT)
- `shiprocket_api_key` (TEXT)

#### 2. Platform Settings Interface
Update `src/lib/platform-settings.ts` to include these new keys in the `PlatformSettings` interface so TypeScript recognizes them.

#### 3. Super Admin UI (`settings.astro`)
Update `src/pages/super-admin/settings.astro` to add input fields for these global API keys.
Update `src/pages/api/super-admin/update-platform-settings.ts` to parse and save these keys securely to the `platform_settings` table.

#### 4. Implementing the Fallback Logic
Update the existing serverless functions to first check the tenant's settings, then fall back to the platform settings:
- **AI Endpoints**: Update `generate-ai.ts`, `generate-listing.ts`, `generate-flash-sale.ts`, `generate-hero.ts`, and `ai-assistant.ts`.
  ```typescript
  const platform = await getPlatformSettings();
  const apiKey = (settings?.gemini_api_key || platform?.gemini_api_key || process.env.GEMINI_API_KEY).trim();
  ```
- **Delivery Services**: In `icarry.ts` and `shiprocket.ts`, implement a similar fallback if the store hasn't set their own keys.
  - *Note for Delivery*: If a tenant uses the global VyaparPe delivery API key, we will eventually enforce a fixed "VyaparPe Delivery Rate" for them, overriding the dynamic rate to ensure VyaparPe can monetize the shipping. (This fixed rate logic can be implemented in the shipping calculator).

## Implementation Phases
*These features are currently deferred and will be implemented in a future sprint.*
