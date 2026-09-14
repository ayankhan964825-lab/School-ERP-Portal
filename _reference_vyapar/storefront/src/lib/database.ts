import { TABLES } from './constants';
import { createClient } from '@supabase/supabase-js';
import { optimizeDataUrls } from './cdn';
import * as mockDb from './mockDb';
import { getTenantId } from './storeContext';
import { fetchWithRetry } from './fetch-retry';
import crypto from 'crypto';

// Attempt to load from Astro env first, fallback to hardcoded public keys
const supabaseUrl = (import.meta as any).env?.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabase = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_PROJECT_ID') &&
  !supabaseAnonKey.includes('YOUR_ANON_KEY_HERE')
);
const fetchNoCache = async (...args: any[]) => {
  try {
    const fetchOpts = { ...args[1], cache: 'no-store' };
    
    // Inject tenant ID into request headers for Postgres RLS evaluation
    try {
      const storeId = getTenantId();
      if (storeId && storeId !== 'SUPER_ADMIN_BYPASS') {
        let headersObj: Record<string, string> = {};
        if (fetchOpts.headers) {
          if (fetchOpts.headers instanceof Headers) {
            fetchOpts.headers.forEach((value: string, key: string) => {
              headersObj[key] = value;
            });
          } else {
            headersObj = { ...fetchOpts.headers };
          }
        }
        headersObj['x-store-id'] = storeId;
        fetchOpts.headers = headersObj;
      }
    } catch (e) {
      // getTenantId throws if context is lost (e.g., static build time)
    }

    return await fetchWithRetry(args[0] as string, fetchOpts);
  } catch (err: any) {
    console.error('[Supabase Fetch Error]', err.message || err);
    // Return a mock response so Supabase client returns an error object instead of crashing Astro
    return new Response(JSON.stringify({ error: 'Network fetch failed' }), { 
      status: 502, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

const rawSupabase = isSupabase ? createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: fetchNoCache } }) : null;
export const rawSupabaseAdmin = isSupabase ? (supabaseServiceKey && !supabaseServiceKey.includes('YOUR_SERVICE_ROLE_KEY_HERE') ? createClient(supabaseUrl, supabaseServiceKey, { global: { fetch: fetchNoCache } }) : null) : null;

// The list of tables that require store_id isolation
// MUST match every table in migration_v2 that has a store_id column
const TENANT_TABLES = [
  'products', 'product_variants', 'categories', 'orders', 'order_items', 
  'customers', 'addresses', 'settings', 'flash_sales', 'blog_posts', 
  'hero_slides', 'coupons', 'affiliates', 'affiliate_offers', 'wallets', 
  'wallet_transactions', 'payouts', 'notifications', 'reviews', 'staff',
  // Audit fix: previously missing tables
  'feedback', 'bulk_inquiries', 'shipping_zones', 'ndr_logs',
  'expenses', 'remittances', 'milestone_offers', 'auth_rate_limits',
  // V16 Audit Fix: strictly isolate marketplace, payout, and service tables
  'marketplace_listings', 'marketplace_applications', 'payout_requests', 'store_service_requests', 'activity_logs',
  'newsletter_subscribers', 'password_recovery_requests',
  // Multi-tenant delivery leak fix
  'locations', 'inventory_levels', 'inventory_transactions', 'shipping_rates', 'tax_settings'
];

function createTenantProxy(client: any) {
  if (!client) return null;
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => {
           const queryBuilder = target.from(table);
           
           // Pass-through for tables without store_id
           if (!TENANT_TABLES.includes(table)) return queryBuilder;

           // We intercept Postgrest filter builders dynamically
           return new Proxy(queryBuilder, {
               get(qbTarget: any, qbProp: string) {
                   if (qbProp === 'select' || qbProp === 'delete') {
                       return (...args: any[]) => {
                           const storeId = getTenantId();
                           if (storeId === 'SUPER_ADMIN_BYPASS') return qbTarget[qbProp](...args);
                           return qbTarget[qbProp](...args).eq('store_id', storeId);
                       };
                   }
                   if (qbProp === 'update') {
                       return (payload: any, ...args: any[]) => {
                           const storeId = getTenantId();
                           if (storeId === 'SUPER_ADMIN_BYPASS') return qbTarget[qbProp](payload, ...args);
                           
                           // FORCEFULLY overwrite store_id to prevent ownership transfer hijacking
                           if (payload && typeof payload === 'object') {
                               payload.store_id = storeId;
                           }
                           
                           return qbTarget[qbProp](payload, ...args).eq('store_id', storeId);
                       };
                   }
                   if (qbProp === 'insert' || qbProp === 'upsert') {
                       return (payload: any, ...args: any[]) => {
                           const storeId = getTenantId();
                           if (storeId !== 'SUPER_ADMIN_BYPASS') {
                               if (Array.isArray(payload)) {
                                   // FORCEFULLY overwrite store_id in every item
                                   payload.forEach(p => { if (p && typeof p === 'object') p.store_id = storeId; });
                               } else if (payload && typeof payload === 'object') {
                                   // FORCEFULLY overwrite store_id
                                   payload.store_id = storeId;
                               }
                           }
                           return qbTarget[qbProp](payload, ...args);
                       };
                   }
                   return qbTarget[qbProp];
               }
           });
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

export const supabase = createTenantProxy(rawSupabase);
export const supabaseAdmin = createTenantProxy(rawSupabaseAdmin);


// ── IN-MEMORY CACHE (Bypasses Supabase latency on warm Vercel Lambdas) ──
interface CacheEntry<T> { data: T; timestamp: number; }
const memoryCacheMap: Record<string, CacheEntry<any>> = {};
const CACHE_TTL_MS = 2000; // 2 seconds to allow instant refresh after saving

export function getCached<T>(key: string, customTtlMs?: number): T | null {
  const entry = memoryCacheMap[key];
  const ttl = customTtlMs !== undefined ? customTtlMs : CACHE_TTL_MS;
  if (entry && (Date.now() - entry.timestamp < ttl)) {
    return entry.data;
  }
  return null;
}

export function clearCached(key: string) {
  Object.keys(memoryCacheMap).forEach(k => {
    if (k === key || k.startsWith(key + '_')) {
      delete memoryCacheMap[k];
    }
  });
}

export function setCached<T>(key: string, data: T): T {
  memoryCacheMap[key] = { data, timestamp: Date.now() };
  if (Array.isArray(data)) {
    return data;
  }
  return data;
}

/**
 * Fetch store core details
 */
export async function getStore(storeId: string) {
  if (!storeId) return null;
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();
    
  if (error) {
    console.error('Error fetching store:', error);
    return null;
  }
  return data;
}

export function clearCache(key: string) {
  delete memoryCacheMap[key];
}



if (isSupabase) {
  console.log('[Database] Using live Supabase database');
} else {
  console.log('[Database] Using local JSON mock database. Set Supabase keys to switch.');
}

// ── SETTINGS ─────────────────────────────────────────────────────────

export async function getSettings(forceStoreId?: string, forceBypassCache: boolean = false) {
  // Scope cache key per-tenant to prevent cross-store contamination
  const tenantId = forceStoreId || getTenantId();
  const cacheKey = `settings_${tenantId}`;
  
  // In development, Astro Vite isolates module graphs so API routes and SSR pages don't share memory.
  // We bypass the cache in dev so changes to settings show up immediately in the UI.
  const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
  if (!isDev && !forceBypassCache) {
    const cached = getCached<any>(cacheKey, 60000);
    if (cached) return cached;
  }

  if (isSupabase && rawSupabaseAdmin) {
    // The tenant proxy auto-injects .eq('store_id', storeId) for settings table
    // If forceStoreId is provided (Astro SSR context loss workaround), bypass proxy
    const client = forceStoreId ? rawSupabaseAdmin : supabaseAdmin;
    let query = client.from(TABLES.SETTINGS).select('*');
    if (forceStoreId) {
      query = query.eq('store_id', forceStoreId);
    }
    if (tenantId === 'SUPER_ADMIN_BYPASS') {
      query = query.order('id', { ascending: true });
    }
    let { data, error } = await query.limit(1).single();
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Supabase Settings Error:', error);
      }
      return setCached(cacheKey, {});
    }
    if (data) {
      if (data.pages_content) {
        let pc = data.pages_content;
        if (typeof pc === 'string') {
          try {
            pc = JSON.parse(pc);
            while (typeof pc === 'string') pc = JSON.parse(pc);
          } catch { pc = {}; }
        }
        if (pc && typeof pc === 'object') {
          Object.assign(data, pc);
          data.pages_content = pc;
        }
      }
      const parseJsonField = (val) => {
        if (typeof val === 'string') {
          try {
            let parsed = JSON.parse(val);
            while (typeof parsed === 'string') parsed = JSON.parse(parsed);
            return parsed;
          } catch { return []; }
        }
        return val;
      };
      data.team_members = parseJsonField(data.team_members) || [];
      // Inject HSN defaults safely without polluting cache-setter side-effects
      data.default_hsn_code = data.default_hsn_code || '0813';
      data.default_gst_rate = data.default_gst_rate || 5;
      return setCached(cacheKey, optimizeDataUrls(data));
    }
    return {}; // Secure default instead of mockDb
  }
  return optimizeDataUrls(mockDb.getSettings());
}

export async function saveSettings(newSettings: any) {
  if (isSupabase) {
    if (!supabaseAdmin) {
      throw new Error("Cannot save settings: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.");
    }
    const current = await getSettings();
    const updated = { ...current, ...newSettings };
    
    // Filter out keys that don't exist in the Supabase schema
    const validKeys = [
      'id', 'store_name', 'contact_email', 'contact_phone', 'currency', 'gemini_api_key', 
      'razorpay_key_id', 'razorpay_key_secret', 'telegram_bot_token', 'telegram_chat_id', 
      'twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number', 'cod_enabled', 
      'razorpay_enabled', 'phonepe_enabled', 'test_otp_mode_enabled', 'free_shipping_threshold', 
      'flat_shipping_rate', 'minimum_order_amount', 'razorpay_webhook_secret', 'phonepe_merchant_id', 
      'phonepe_salt_key', 'icarry_api_token', 'icarry_default_weight', 'resend_api_key', 
      'admin_email', 'gtm_id', 'meta_pixel_id', 'google_ads_id', 'allow_coupon_stacking',
      'trending_slider_enabled', 'trending_slider_title', 'trending_slider_products', 'state_shipping_rules',
      'auth_mode', 'brand_name', 'pages_content', 'team_visibility', 'team_members',
      'default_hsn_code', 'default_gst_rate', 'store_id', 'primary_domestic_gateway',
      'default_courier_partner', 'hyperlocal_courier_partner', 'shiprocket_token', 'porter_api_key',
      'meta_capi_token', 'whatsapp_api_token', 'whatsapp_phone_number_id',
      'delivery_days_min', 'delivery_days_max', 'max_cod_amount', 'restricted_pincodes'
    ];
    
    const supabasePayload: any = {};
    const pagesContent: any = current.pages_content || {};

    for (const key of Object.keys(updated)) {
      if (validKeys.includes(key)) {
        if (updated[key] !== undefined && updated[key] !== '[HIDDEN]') {
          supabasePayload[key] = updated[key];
        }
        delete pagesContent[key];
      } else if (key !== 'id') {
        pagesContent[key] = updated[key];
      }
    }
    supabasePayload.pages_content = pagesContent;

    // Ensure store_id is always set
    if (!supabasePayload.store_id) {
      supabasePayload.store_id = getTenantId();
    }
    
    // Parse known JSON fields so they are stored correctly as raw JSONB in Supabase
    const jsonFields = ['team_members', 'trending_slider_products', 'state_shipping_rules', 'about_process_steps'];
    for (const k of jsonFields) {
      // Check in supabasePayload
      if (supabasePayload[k] !== undefined && typeof supabasePayload[k] === 'string') {
        try {
          let parsed = JSON.parse(supabasePayload[k]);
          while (typeof parsed === 'string') parsed = JSON.parse(parsed);
          supabasePayload[k] = parsed;
        } catch (e) {}
      }
      // Check in pages_content fallback
      if (pagesContent[k] !== undefined && typeof pagesContent[k] === 'string') {
        try {
          let parsed = JSON.parse(pagesContent[k]);
          while (typeof parsed === 'string') parsed = JSON.parse(parsed);
          pagesContent[k] = parsed;
        } catch (e) {}
      }
    }

    // Safely update or insert to prevent cross-tenant overrides
    let data, error;
    if (!current || Object.keys(current).length === 0) {
      // Row doesn't exist for this tenant, insert a new one
      // We generate a unique ID based on the tenant ID to avoid primary key collisions
      supabasePayload.id = `set_${getTenantId().replace(/-/g, '').substring(0, 16)}`;
      const result = await supabaseAdmin.from(TABLES.SETTINGS).insert(supabasePayload).select().single();
      data = result.data;
      error = result.error;
    } else {
      // Row exists, update strictly matching the store_id
      const result = await supabaseAdmin.from(TABLES.SETTINGS)
        .update(supabasePayload)
        .eq('store_id', getTenantId()) // Enforce tenant boundary
        .select().single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Supabase saveSettings error:', error);
      throw error;
    }
    clearCached(`settings_${getTenantId()}`);
    clearCached('settings_00000000-0000-0000-0000-000000000002');
    clearCached('settings_e6b1560c-13e7-4abb-b84b-a6a6a760a5e0');
    clearCached('settings_SUPER_ADMIN_BYPASS');
    clearCached('settings_global');
    return data;
  }
  return mockDb.saveSettings(newSettings);
}

// ── PRODUCTS ─────────────────────────────────────────────────────────

// Import full catalog as fallback only
import catalogData from '../../../catalog_data.json';
const catalogBySlug: Record<string, any> = {};
(catalogData as any[]).forEach(p => { catalogBySlug[p.slug] = p; });

function normalizeProduct(dbProd: any) {
  // Parse jsonb fields (Supabase returns them already parsed, but just in case)
  const parse = (val: any, fb: any = []) => {
    let result = val;
    if (typeof val === 'string') { 
        try { result = JSON.parse(val); } catch { result = fb; } 
    }
    if (Array.isArray(fb)) {
        return Array.isArray(result) ? result : fb;
    }
    if (result && typeof result === 'object') return result;
    return fb;
  };
  return {
    ...dbProd,
    variants:      parse(dbProd.variants, []),
    variant_options: parse(dbProd.variant_options, []),
    custom_inputs: parse(dbProd.custom_inputs, []),
    bullet_points: parse(dbProd.bullet_points, []),
    badges:        parse(dbProd.badges, []),
    specifications:parse(dbProd.specifications, {}),
    long_description: dbProd.long_description || '',
    image: dbProd.image || `/products/${dbProd.slug}.webp`,
    b2b_variants: parse(dbProd.b2b_variants, []),
    rating: { value: dbProd.rating || 0, count: dbProd.reviews_count || 0 },
    track_inventory: typeof dbProd.specifications?._track_inventory === 'boolean' 
      ? dbProd.specifications._track_inventory 
      : (dbProd.track_inventory !== false),
    is_digital: dbProd.is_digital === true,
    digital_delivery_url: dbProd.digital_delivery_url || null,
  };
}

export async function getProducts(
  forceStoreId?: string, 
  limit?: number, 
  offset?: number,
  categorySlugs?: string[],
  searchQuery?: string,
  sortQuery?: string,
  hideQCommerce?: boolean,
  onlyActive?: boolean
): Promise<any[]> {
  // AUDIT FIX: Cache key must be per-tenant to prevent cross-store data leaks on warm lambdas
  const tenantId = forceStoreId || (() => { try { return getTenantId(); } catch { return 'global'; } })();
  const cacheKey = `products_${tenantId}_${limit || 'all'}_${offset || 0}_${categorySlugs?.join(',') || 'all'}_${searchQuery || ''}_${sortQuery || ''}_${hideQCommerce || false}_${onlyActive || false}`;
  const cached = getCached<any[]>(cacheKey, 60000); // 60s cache
  if (cached) return cached;

  let products = [];
  if (isSupabase && rawSupabase) {
    // Kick off flash sales fetch in parallel with products (independent queries)
    const flashSalesPromise = getFlashSales(forceStoreId);

    const client = forceStoreId ? rawSupabase : supabase;
    let query = client.from(TABLES.PRODUCTS).select('*');
    if (forceStoreId) {
      query = query.eq('store_id', forceStoreId);
    }
    
    // DB-Level Filtering
    if (categorySlugs && categorySlugs.length > 0) {
      query = query.in('category', categorySlugs);
    }
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }
    if (hideQCommerce) {
      query = query.or('is_q_commerce_only.eq.false,is_q_commerce_only.is.null');
    }
    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    if (sortQuery === 'name-asc') {
      query = query.order('name', { ascending: true });
    } else if (sortQuery === 'name-desc') {
      query = query.order('name', { ascending: false });
    } else if (sortQuery === 'price-asc') {
      // NOTE: since we cannot easily sort by child table price in standard PostgREST without an RPC, 
      // we fallback to created_at or we sort the limited subset in memory later.
      // But we can sort by name as fallback for now
      query = query.order('name', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (limit) {
      query = query.range(offset || 0, (offset || 0) + limit - 1);
    }
    // Execute main products query first
    const { data, error } = await query;
    if (error) {
      console.error('Supabase Products Error:', error);
      throw error;
    }

    let variantsData: any[] = [];
    let varErr: any = null;

    if (data && data.length > 0) {
      const variantClient = forceStoreId ? (rawSupabaseAdmin || rawSupabase) : (supabaseAdmin || supabase);
      let vQuery = variantClient!.from(TABLES.PRODUCT_VARIANTS).select('*').eq('store_id', forceStoreId || getTenantId());
      
      // If fetching a limited page, only fetch variants for those specific products.
      // If fetching full catalog (no limit), fetch all variants to avoid 414 URI Too Large errors with huge IN clauses.
      if (limit) {
        const productIds = data.map((p: any) => p.id);
        vQuery = vQuery.in('product_id', productIds);
      }
        
      const vResult = await vQuery;
      variantsData = vResult.data || [];
      varErr = vResult.error;
    }

    let variantsMap: Record<string, any[]> = {};
    let b2bVariantsMap: Record<string, any[]> = {};
    
    if (!varErr && variantsData) {
      variantsData.forEach(v => {
        // Normalize names back to UI expected keys (e.g. originalPrice instead of original_price)
        const normV = {
          id: v.id,
          name: v.name,
          weight: v.weight,
          price: Number(v.price),
          originalPrice: Number(v.original_price),
          mrp: Number(v.original_price),
          stock: Number(v.stock),
          sku: v.sku,
          is_out_of_stock: v.is_out_of_stock || false,
          is_hidden: v.is_hidden || false,
          b2b_price: v.b2b_price,
          pos_price: v.pos_price
        };
        
        if (v.is_b2b) {
          if (!b2bVariantsMap[v.product_id]) b2bVariantsMap[v.product_id] = [];
          b2bVariantsMap[v.product_id].push(normV);
        } else {
          if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
          variantsMap[v.product_id].push(normV);
        }
      });
    }

    products = (data || []).map(p => {
       const norm = normalizeProduct(p);
       // Override legacy JSONB with normalized rows if they exist
       if (variantsMap[p.id] && variantsMap[p.id].length > 0) {
         norm.variants = variantsMap[p.id].map(v => {
           const jsonbMatch = norm.variants.find((oldV: any) => oldV.id === v.id || (oldV.weight && oldV.weight === v.weight) || (oldV.name && oldV.name === v.name));
           return { ...v, images: jsonbMatch?.images || [] };
         }).sort((a: any, b: any) => a.price - b.price);
       }
       if (b2bVariantsMap[p.id] && b2bVariantsMap[p.id].length > 0) {
         norm.b2b_variants = b2bVariantsMap[p.id].map(v => {
           const jsonbMatch = norm.b2b_variants.find((oldV: any) => oldV.id === v.id || (oldV.weight && oldV.weight === v.weight) || (oldV.name && oldV.name === v.name));
           return { ...v, images: jsonbMatch?.images || [] };
         }).sort((a: any, b: any) => a.price - b.price);
       }
       
       // Map virtual column track_inventory from specifications
       if (norm.specifications && norm.specifications._track_inventory !== undefined) {
         norm.track_inventory = norm.specifications._track_inventory;
       } else if (norm.specifications && norm.specifications.track_inventory !== undefined) {
         norm.track_inventory = norm.specifications.track_inventory;
       }
       
       return norm;
    });

    // --- GLOBAL FLASH SALE INJECTION ---
    // Await the parallel flash sales fetch (already started above)
    const activeSales = (await flashSalesPromise).filter((s: any) => {
      const now = new Date();
      return new Date(s.startDate) <= now && new Date(s.endDate) > now && s.status !== 'expired';
    });

    if (activeSales.length > 0) {
      products = products.map((p: any) => {
        const pSales = activeSales.filter((s: any) => s.product === p.name);
        if (pSales.length > 0) {
          const updatedVariants = p.variants.map((v: any) => {
            const vSale = pSales.find((s: any) => !s.variant || s.variant === '' || s.variant === v.weight || s.variant === v.name);
            const variantMrp = v.mrp || v.price;
            if (vSale && vSale.salePrice < variantMrp) {
              return {
                ...v,
                originalPrice: variantMrp,
                price: vSale.salePrice,
                isFlashSale: true,
                flashSaleEndDate: vSale.endDate,
                stockType: vSale.stockType || 'none',
                totalStock: vSale.totalStock || 0,
                soldStock: vSale.soldStock || 0,
                fakePercentage: vSale.fakePercentage || 0
              };
            }
            return v;
          });
          return { ...p, variants: updatedVariants };
        }
        return p;
      });
    }
  } else {
    products = await mockDb.getProducts();
  }

  return setCached(cacheKey, optimizeDataUrls(products));
}

/**
 * Returns the list of pincodes eligible for Q-Commerce delivery for this store.
 * Result is cached in-memory for 60 seconds to avoid an N+1 DB query on every page load.
 */
export async function getQCommercePincodes(forceStoreId?: string): Promise<string[]> {
  const cacheKey = `qcommerce_pincodes_${forceStoreId || 'global'}`;
  const cached = getCached<string[]>(cacheKey, 60000);
  if (cached) return cached;

  if (!isSupabase || !supabaseAdmin) return setCached(cacheKey, []);

  const { data: locations } = await supabaseAdmin
    .from('locations')
    .select('zone_type, delivery_pincodes')
    .eq('store_id', forceStoreId || getTenantId())
    .eq('is_active', true)
    .eq('q_commerce_enabled', true);

  if (!locations || locations.length === 0) return setCached(cacheKey, []);

  const pincodes: string[] = [];
  let hasRadius = false;
  for (const loc of locations) {
    if (loc.zone_type === 'pincode' && Array.isArray(loc.delivery_pincodes)) {
      pincodes.push(...loc.delivery_pincodes.map((p: string) => p.trim()));
    } else if (loc.zone_type === 'radius') {
      hasRadius = true;
    }
  }

  if (hasRadius) {
    pincodes.push('__HAS_RADIUS_ZONES__');
  }

  return setCached(cacheKey, [...new Set(pincodes)]);
}

export async function getStorefrontProducts(
  forceStoreId?: string, 
  customerPincode?: string | null, 
  qcEligibleCookie?: string | null, 
  limit?: number, 
  offset?: number,
  categorySlugs?: string[],
  searchQuery?: string,
  sortQuery?: string
): Promise<any[]> {
  let hasQCommerceCoverage = false;
  if (isSupabase) {
    const settings = await getSettings(forceStoreId);
    // If Pure Q-Commerce mode is ON, show all products and gate at checkout.
    if (settings?.is_pure_q_commerce === 'true' || settings?.is_pure_q_commerce === true) {
      hasQCommerceCoverage = true;
    } else {
      if (customerPincode) {
        const eligiblePincodes = await getQCommercePincodes(forceStoreId);
        hasQCommerceCoverage = eligiblePincodes.includes(customerPincode.trim());
      }
      if (!hasQCommerceCoverage && (qcEligibleCookie === '1' || qcEligibleCookie === 'true')) {
        hasQCommerceCoverage = true;
      }
    }
  }

  const hideQCommerce = isSupabase ? !hasQCommerceCoverage : false;
  const allProducts = await getProducts(forceStoreId, limit, offset, categorySlugs, searchQuery, sortQuery, hideQCommerce, true);
  
  // Filter out hidden variants for storefront display
  allProducts.forEach(p => {
    if (p.variants) {
      p.variants = p.variants.filter((v: any) => !v.is_hidden);
    }
    if (p.b2b_variants) {
      p.b2b_variants = p.b2b_variants.filter((v: any) => !v.is_hidden);
    }
  });
  
  return allProducts;
}

export async function getStorefrontProductsCount(
  forceStoreId?: string, 
  categorySlugs?: string[],
  searchQuery?: string,
  hideQCommerce?: boolean
): Promise<number> {
  if (!isSupabase || !rawSupabase) {
    const products = await getProducts(forceStoreId, undefined, undefined, categorySlugs, searchQuery, undefined, hideQCommerce, true);
    return products.length;
  }
  const tenantId = forceStoreId || (() => { try { return getTenantId(); } catch { return 'global'; } })();
  const cacheKey = `products_count_${tenantId}_${categorySlugs?.join(',') || 'all'}_${searchQuery || ''}_${hideQCommerce || false}`;
  const cached = getCached<number>(cacheKey, 60000);
  if (cached !== null) return cached;
  
  const client = forceStoreId ? rawSupabase : supabase;
  let query = client.from(TABLES.PRODUCTS).select('id', { count: 'exact', head: true }).eq('is_active', true);
  if (forceStoreId) query = query.eq('store_id', forceStoreId);
  if (categorySlugs && categorySlugs.length > 0) query = query.in('category', categorySlugs);
  if (searchQuery) query = query.ilike('name', `%${searchQuery}%`);
  if (hideQCommerce) query = query.or('is_q_commerce_only.eq.false,is_q_commerce_only.is.null');
  
  const { count } = await query;
  return setCached(cacheKey, count || 0);
}

export async function getProductBySlug(slug: string, forceStoreId?: string): Promise<any | null> {
  const cacheKey = `product_${slug}_${forceStoreId || 'global'}`;
  const cached = getCached<any>(cacheKey, 60000);
  if (cached) return cached;

  if (isSupabase && rawSupabase) {
    const flashSalesPromise = getFlashSales(forceStoreId);
    
    const client = forceStoreId ? rawSupabase : supabase;
    let query = client.from(TABLES.PRODUCTS).select('*').eq('slug', slug);
    if (forceStoreId) query = query.eq('store_id', forceStoreId);
    
    const { data: pData, error } = await query.single();
    if (error || !pData) return null;

    const variantClient = forceStoreId ? (rawSupabaseAdmin || rawSupabase) : (supabaseAdmin || supabase);
    let vQuery = variantClient!.from(TABLES.PRODUCT_VARIANTS).select('*').eq('product_id', pData.id);
    if (forceStoreId) vQuery = vQuery.eq('store_id', forceStoreId);
    const { data: variantsData } = await vQuery;

    let variantsMap: any[] = [];
    let b2bVariantsMap: any[] = [];

    if (variantsData) {
      variantsData.forEach(v => {
        const normV = {
          id: v.id, name: v.name, weight: v.weight, price: Number(v.price),
          originalPrice: Number(v.original_price), mrp: Number(v.original_price),
          stock: Number(v.stock), sku: v.sku, is_out_of_stock: v.is_out_of_stock || false,
          is_hidden: v.is_hidden || false
        };
        if (v.is_b2b) b2bVariantsMap.push(normV);
        else variantsMap.push(normV);
      });
    }

    const norm = normalizeProduct(pData);
    if (variantsMap.length > 0) {
      norm.variants = variantsMap.map(v => {
        const jsonbMatch = norm.variants.find((oldV: any) => oldV.id === v.id || (oldV.weight && oldV.weight === v.weight) || (oldV.name && oldV.name === v.name));
        return { ...v, images: jsonbMatch?.images || [] };
      }).sort((a: any, b: any) => a.price - b.price);
    }
    if (b2bVariantsMap.length > 0) {
      norm.b2b_variants = b2bVariantsMap.map(v => {
        const jsonbMatch = norm.b2b_variants.find((oldV: any) => oldV.id === v.id || (oldV.weight && oldV.weight === v.weight) || (oldV.name && oldV.name === v.name));
        return { ...v, images: jsonbMatch?.images || [] };
      }).sort((a: any, b: any) => a.price - b.price);
    }

    // Flash sale injection
    const activeSales = (await flashSalesPromise).filter((s: any) => {
      const now = new Date();
      return new Date(s.startDate) <= now && new Date(s.endDate) > now && s.status !== 'expired';
    });

    if (activeSales.length > 0) {
      const pSales = activeSales.filter((s: any) => s.product === norm.name);
      if (pSales.length > 0) {
        const updatedVariants = norm.variants.map((v: any) => {
          const vSale = pSales.find((s: any) => !s.variant || s.variant === '' || s.variant === v.weight || s.variant === v.name);
          const variantMrp = v.mrp || v.price;
          if (vSale && vSale.salePrice < variantMrp) {
            return {
              ...v, originalPrice: variantMrp, price: vSale.salePrice, isFlashSale: true,
              flashSaleEndDate: vSale.endDate, stockType: vSale.stockType || 'none',
              totalStock: vSale.totalStock || 0, soldStock: vSale.soldStock || 0, fakePercentage: vSale.fakePercentage || 0
            };
          }
          return v;
        });
        norm.variants = updatedVariants;
      }
    }

    return setCached(cacheKey, norm);
  } else {
    const products = await mockDb.getProducts();
    const product = products.find(p => p.slug === slug);
    return setCached(cacheKey, product || null);
  }
}

export async function getRelatedProducts(category: string, excludeId: string, forceStoreId?: string): Promise<any[]> {
  if (!category) return [];
  const cacheKey = `related_${category}_${excludeId}_${forceStoreId || 'global'}`;
  const cached = getCached<any[]>(cacheKey, 60000);
  if (cached) return cached;

  if (isSupabase && rawSupabase) {
    const client = forceStoreId ? rawSupabase : supabase;
    let query = client.from(TABLES.PRODUCTS).select('*').eq('category', category).neq('id', excludeId).limit(4);
    if (forceStoreId) query = query.eq('store_id', forceStoreId);
    
    const { data, error } = await query;
    if (error || !data) return [];
    
    const productIds = data.map(p => p.id);
    let variantsMap: Record<string, any[]> = {};
    if (productIds.length > 0) {
      const variantClient = forceStoreId ? (rawSupabaseAdmin || rawSupabase) : (supabaseAdmin || supabase);
      let vQuery = variantClient!.from(TABLES.PRODUCT_VARIANTS).select('*').in('product_id', productIds).eq('is_b2b', false);
      if (forceStoreId) vQuery = vQuery.eq('store_id', forceStoreId);
      const { data: variantsData } = await vQuery;
      if (variantsData) {
        variantsData.forEach(v => {
          if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
          variantsMap[v.product_id].push({
            id: v.id, name: v.name, weight: v.weight, price: Number(v.price),
            originalPrice: Number(v.original_price), mrp: Number(v.original_price),
            stock: Number(v.stock), sku: v.sku, is_out_of_stock: v.is_out_of_stock || false,
            is_hidden: v.is_hidden || false
          });
        });
      }
    }

    let products = data.map(p => {
       const norm = normalizeProduct(p);
       if (variantsMap[p.id] && variantsMap[p.id].length > 0) {
         norm.variants = variantsMap[p.id].map(v => {
           const jsonbMatch = norm.variants.find((oldV: any) => oldV.id === v.id || (oldV.weight && oldV.weight === v.weight) || (oldV.name && oldV.name === v.name));
           return { ...v, images: jsonbMatch?.images || [] };
         }).sort((a: any, b: any) => a.price - b.price);
       }
       return norm;
    });
    
    return setCached(cacheKey, products);
  } else {
    const products = await mockDb.getProducts();
    const related = products.filter(p => p.category === category && p.id !== excludeId).slice(0, 4);
    return setCached(cacheKey, related);
  }
}

export async function updateProductVariants(productId: string, variants: any[], overrideStoreId?: string) {
  if (isSupabase && supabaseAdmin) {
    const tenantId = overrideStoreId || getTenantId();
    
    // Fetch the store_id from the products table first
    const { data: productData } = await supabaseAdmin.from(TABLES.PRODUCTS).select('store_id').eq('id', productId).single();
    const storeId = productData?.store_id || tenantId;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Fetch existing variants to preserve stock and is_out_of_stock
    const { data: existingVariants } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS)
       .select('id, stock, is_out_of_stock')
       .eq('product_id', productId)
       .eq('is_b2b', false);
       
    const existingMap = new Map((existingVariants || []).map((v: any) => [v.id, v]));

    const validVariants = (variants || []).map((v: any) => {
       const id = (v.id && uuidRegex.test(v.id)) ? v.id : crypto.randomUUID();
       const existing: any = existingMap.get(id);
       return {
         ...v,
         id,
         // Frontend passes stock: 0 as placeholder, so we preserve existing stock unless an explicit positive stock is sent
         stock: existing ? existing.stock : (parseInt(v.stock, 10) || 0),
         // Frontend doesn't send is_out_of_stock on full save, so preserve it if missing
         is_out_of_stock: existing ? existing.is_out_of_stock : (v.is_out_of_stock || false)
       };
    });

    // Legacy JSONB update
    const { data, error } = await supabaseAdmin.from(TABLES.PRODUCTS).update({ variants: validVariants }).eq('id', productId).eq('store_id', tenantId).select().single();
    if (error) {
      console.error('Supabase updateProductVariants Error:', error);
      throw error;
    }
    
    if (validVariants && validVariants.length > 0) {
       const rowsToUpsert = validVariants.map(v => ({
           id: v.id,
           product_id: productId,
           store_id: storeId,
           name: v.name || 'Default',
           weight: v.weight,
           price: v.price || 0,
           original_price: v.originalPrice || v.original_price || v.mrp || 0,
           stock: v.stock,
           sku: v.sku || null,
           is_b2b: false,
           is_out_of_stock: v.is_out_of_stock,
           is_hidden: v.is_hidden || false
       }));
       
       rowsToUpsert.forEach(r => { if (!r.id) delete r.id; });
       const existingIds = existingVariants?.map((v: any) => v.id) || [];
       const upsertedIds = rowsToUpsert.map(r => r.id).filter(id => id);
       
       const idsToDelete = existingIds.filter(id => !upsertedIds.includes(id));
       if (idsToDelete.length > 0) {
         await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).delete().in('id', idsToDelete).eq('store_id', tenantId);
       }
       
       const { error: upsertErr } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).upsert(rowsToUpsert, { onConflict: 'id' });
       if (upsertErr) {
           console.error('Error upserting product variants:', upsertErr);
           throw upsertErr;
       }

       // --- MULTI-WAREHOUSE STOCK SYNC ---
       // Sync the variant stock to the default location in inventory_levels.
       // This ensures that when a seller edits product stock from the single-warehouse UI,
       // it reflects properly without breaking Multi-Warehouse constraints.
       if (storeId) {
           const { data: locData } = await supabaseAdmin.from('locations').select('id').eq('store_id', storeId).eq('is_default', true).single();
           if (locData?.id) {
               const { data: newVariants } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).select('id, stock').in('product_id', [productId]).eq('is_b2b', false);
               if (newVariants && newVariants.length > 0) {
                   const inventoryLevels = newVariants.map((v: any) => ({
                       variant_id: v.id,
                       location_id: locData.id,
                       store_id: storeId,
                       available: v.stock || 0
                   }));
                   // Use upsert with ignoreDuplicates to only insert initial stock for new variants, 
                   // without overwriting existing inventory if the product is edited later.
                   const { error: invError } = await supabaseAdmin.from('inventory_levels').upsert(inventoryLevels, { onConflict: 'variant_id,location_id', ignoreDuplicates: true });
                   if (invError) console.error('Error syncing inventory levels:', invError);
               }
           }
       }

    } else {
       // If empty variants array, delete all standard variants for this product
       await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).delete().eq('product_id', productId).eq('is_b2b', false).eq('store_id', getTenantId());
    }

    return data;
  }
  
  if (mockDb.updateProductVariants) {
    return mockDb.updateProductVariants(productId, variants);
  }
  return true;
}

export async function updateProductB2BVariants(productId: string, b2b_variants: any[]) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.PRODUCTS).update({ b2b_variants }).eq('id', productId).eq('store_id', getTenantId()).select().single();
    if (error) {
      console.warn('Supabase updateProductB2BVariants Warning:', error);
    }
    
    if (b2b_variants && b2b_variants.length > 0) {
       // Fetch the store_id from the products table first
       const { data: productData } = await supabaseAdmin.from(TABLES.PRODUCTS).select('store_id').eq('id', productId).single();
       const storeId = productData?.store_id || null;
       const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
       // Ensure all variants have valid UUIDs in the database layer for legacy WP imported ones
       const validVariants = b2b_variants.map(v => {
          return {
            ...v,
            id: (v.id && uuidRegex.test(v.id)) ? v.id : crypto.randomUUID()
          };
       });
       
       const rowsToUpsert = validVariants.map(v => ({
           id: v.id,
           product_id: productId,
           store_id: storeId,
           name: v.name || 'Default',
           weight: v.weight,
           price: v.price || 0,
           original_price: v.originalPrice || v.original_price || 0,
           stock: v.stock || 0,
           sku: v.sku,
           is_b2b: true,
           is_out_of_stock: v.is_out_of_stock || false,
           is_hidden: v.is_hidden || false
       }));
       
       // Sync updated variants (with new UUIDs) back to products table if any IDs changed
       if (JSON.stringify(b2b_variants.map(v => v.id)) !== JSON.stringify(validVariants.map(v => v.id))) {
           await supabaseAdmin.from(TABLES.PRODUCTS).update({ b2b_variants: validVariants }).eq('id', productId).eq('store_id', getTenantId());
       }
       
       rowsToUpsert.forEach(r => { if (!r.id) delete r.id; });
       
       // Get current variant IDs for this product to delete removed ones
       const { data: existingVariants } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).select('id').eq('product_id', productId).eq('is_b2b', true);
       const existingIds = existingVariants?.map(v => v.id) || [];
       const upsertedIds = rowsToUpsert.map(r => r.id).filter(id => id);
       
       const idsToDelete = existingIds.filter(id => !upsertedIds.includes(id));
       if (idsToDelete.length > 0) {
         await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).delete().in('id', idsToDelete).eq('store_id', getTenantId());
       }
       
       const { error: upsertErr } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).upsert(rowsToUpsert, { onConflict: 'id' });
       if (upsertErr) console.error('Error upserting B2B variants:', upsertErr);

       // --- MULTI-WAREHOUSE STOCK SYNC ---
       if (storeId) {
           const { data: locData } = await supabaseAdmin.from('locations').select('id').eq('store_id', storeId).eq('is_default', true).single();
           if (locData?.id) {
               const { data: newVariants } = await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).select('id, stock').in('product_id', [productId]).eq('is_b2b', true);
               if (newVariants && newVariants.length > 0) {
                   const inventoryLevels = newVariants.map((v: any) => ({
                       variant_id: v.id,
                       location_id: locData.id,
                       store_id: storeId,
                       available: v.stock || 0
                   }));
                   const { error: invError } = await supabaseAdmin.from('inventory_levels').upsert(inventoryLevels, { onConflict: 'variant_id,location_id', ignoreDuplicates: true });
                   if (invError) console.error('Error syncing b2b inventory levels:', invError);
               }
           }
       }

    } else {
       // If empty variants array, delete all b2b variants for this product
       await supabaseAdmin.from(TABLES.PRODUCT_VARIANTS).delete().eq('product_id', productId).eq('is_b2b', true).eq('store_id', getTenantId());
    }

    return data;
  }
  
  if (mockDb.updateProductB2BVariants) {
    return mockDb.updateProductB2BVariants(productId, b2b_variants);
  }
  return true;
}


// ── WALLET & COMMISSION ────────────────────────────────────────────────

export async function processOrderCommission(orderId: string, orderAmount: number, storeId: string, shippingAmount: number = 0) {
  if (!isSupabase || !supabaseAdmin || storeId === 'SUPER_ADMIN_BYPASS' || !storeId) return;

  try {
    // 1. Get the store's commission rate and God Mode status
    const { data: store, error: storeErr } = await supabaseAdmin
      .from(TABLES.STORES)
      .select('commission_rate, digital_commission_rate, is_god_mode')
      .eq('id', storeId)
      .single();

    if (storeErr || !store || store.is_god_mode) return; // God mode stores don't pay commission/shipping
    
    // Fetch order items and customer to determine digital vs physical amounts and skip manual orders
    const { data: orderDetails } = await supabaseAdmin.from(TABLES.ORDERS).select('items, customer').eq('order_id', orderId).single();
    const items = orderDetails?.items || [];
    
    const source = orderDetails?.customer?.source;
    if (source === 'b2b_pos' || source === 'pos' || source === 'manual_whatsapp') {
      return; // Do not charge commission for manual billing
    }

    // Check if PG is enabled
    const settings = await getSettings(storeId);
    const hasPrepaidGateway = (settings?.razorpay_enabled !== false && settings?.razorpay_enabled !== 'false') || (settings?.phonepe_enabled !== false && settings?.phonepe_enabled !== 'false');

    let physicalTotal = 0;
    let digitalTotal = 0;
    for (const item of items) {
        if (item.is_digital) digitalTotal += (item.price * (item.quantity || 1));
        else physicalTotal += (item.price * (item.quantity || 1));
    }

    const baseRate = store.commission_rate || 5.0; // fallback to 5%
    const digitalRate = store.digital_commission_rate !== null && store.digital_commission_rate !== undefined ? store.digital_commission_rate : (hasPrepaidGateway ? 5.0 : 2.0);

    let commissionAmount = 0;
    const itemsTotal = physicalTotal + digitalTotal;
    
    if (itemsTotal > 0) {
        const physicalProp = physicalTotal / itemsTotal;
        const digitalProp = digitalTotal / itemsTotal;
        
        const physicalCommission = (orderAmount * physicalProp) * (baseRate / 100);
        const digitalCommission = (orderAmount * digitalProp) * (digitalRate / 100);
        
        commissionAmount = Number((physicalCommission + digitalCommission).toFixed(2));
    } else {
        commissionAmount = Number(((orderAmount * baseRate) / 100).toFixed(2));
    }

    // 2. Call the update_wallet_balance RPC for Commission
    if (commissionAmount > 0) {
      const refId = `COMMISSION_${orderId}`;
      const { data: existing } = await supabaseAdmin.from(TABLES.WALLET_TRANSACTIONS).select('id').eq('reference_id', refId).single();
      
      if (!existing) {
        const { error: walletErr } = await supabaseAdmin.rpc('update_wallet_balance', {
          p_store_id: storeId,
          p_amount: -Math.abs(commissionAmount), // Debit
          p_type: 'commission_debit',
          p_order_id: orderId,
          p_reference_id: refId,
          p_description: `Platform Commission (Mixed Rates) for Order #${orderId}`
        });

        if (walletErr) console.error(`[Commission Error] Failed to deduct commission for order ${orderId}:`, walletErr);
      }
    }

    // 3. Call the update_wallet_balance RPC for Shipping
    if (shippingAmount > 0) {
      const refId = `SHIPPING_${orderId}`;
      const { data: existing } = await supabaseAdmin.from(TABLES.WALLET_TRANSACTIONS).select('id').eq('reference_id', refId).single();
      
      if (!existing) {
        const { error: shipErr } = await supabaseAdmin.rpc('update_wallet_balance', {
          p_store_id: storeId,
          p_amount: -Math.abs(shippingAmount), // Debit
          p_type: 'shipping_debit',
          p_order_id: orderId,
          p_reference_id: refId,
          p_description: `iCarry Shipping Charge for Order #${orderId}`
        });

        if (shipErr) console.error(`[Shipping Error] Failed to deduct shipping for order ${orderId}:`, shipErr);
      }
    }

    // 4. Check Auto-Suspension Limit
    const { data: wallet } = await supabaseAdmin.from(TABLES.WALLETS).select('balance').eq('store_id', storeId).single();
    if (wallet && wallet.balance <= -1000) {
      await supabaseAdmin.from(TABLES.STORES).update({ is_active: false }).eq('id', storeId);
      console.warn(`[Auto-Suspension] Store ${storeId} suspended due to negative wallet balance: ₹${wallet.balance}`);
    }

  } catch (err) {
    console.error(`[Commission Error] Exception processing order ${orderId}:`, err);
  }
}

export async function processOrderCommissionRefund(orderId: string, orderAmount: number, storeId: string) {
  if (!isSupabase || !supabaseAdmin || storeId === 'SUPER_ADMIN_BYPASS' || !storeId) return;

  try {
    const { data: store, error: storeErr } = await supabaseAdmin
      .from(TABLES.STORES)
      .select('commission_rate, digital_commission_rate, is_god_mode')
      .eq('id', storeId)
      .single();

    if (storeErr || !store || store.is_god_mode) return; 
    
    // Fetch order items and customer to determine digital vs physical amounts and skip manual orders
    const { data: orderDetails } = await supabaseAdmin.from(TABLES.ORDERS).select('items, customer').eq('order_id', orderId).single();
    const items = orderDetails?.items || [];

    const source = orderDetails?.customer?.source;
    if (source === 'b2b_pos' || source === 'pos' || source === 'manual_whatsapp') {
      return; // Do not refund commission for manual billing since none was charged
    }

    // Check if PG is enabled
    const settings = await getSettings(storeId);
    const hasPrepaidGateway = (settings?.razorpay_enabled !== false && settings?.razorpay_enabled !== 'false') || (settings?.phonepe_enabled !== false && settings?.phonepe_enabled !== 'false');

    let physicalTotal = 0;
    let digitalTotal = 0;
    for (const item of items) {
        if (item.is_digital) digitalTotal += (item.price * (item.quantity || 1));
        else physicalTotal += (item.price * (item.quantity || 1));
    }

    const baseRate = store.commission_rate || 5.0; 
    const digitalRate = store.digital_commission_rate !== null && store.digital_commission_rate !== undefined ? store.digital_commission_rate : (hasPrepaidGateway ? 5.0 : 2.0);

    let commissionAmount = 0;
    const itemsTotal = physicalTotal + digitalTotal;
    
    if (itemsTotal > 0) {
        const physicalProp = physicalTotal / itemsTotal;
        const digitalProp = digitalTotal / itemsTotal;
        
        const physicalCommission = (orderAmount * physicalProp) * (baseRate / 100);
        const digitalCommission = (orderAmount * digitalProp) * (digitalRate / 100);
        
        commissionAmount = Number((physicalCommission + digitalCommission).toFixed(2));
    } else {
        commissionAmount = Number(((orderAmount * baseRate) / 100).toFixed(2));
    }

    if (commissionAmount > 0) {
      const refId = `COMMISSION_REFUND_${orderId}`;
      const { data: existing } = await supabaseAdmin.from(TABLES.WALLET_TRANSACTIONS).select('id').eq('reference_id', refId).single();
      
      if (!existing) {
        const { error: walletErr } = await supabaseAdmin.rpc('update_wallet_balance', {
          p_store_id: storeId,
          p_amount: Math.abs(commissionAmount), // Credit (Refund)
          p_type: 'commission_refund',
          p_order_id: orderId,
          p_reference_id: refId,
          p_description: `Platform Commission Refund (Mixed Rates) for Returned Order #${orderId}`
        });

        if (walletErr) console.error(`[Commission Refund Error] Failed to refund commission for order ${orderId}:`, walletErr);
      }
    }
  } catch (err) {
    console.error(`[Commission Refund Error] Exception processing order refund ${orderId}:`, err);
  }
}

// ── ORDERS ───────────────────────────────────────────────────────────

export async function saveOrder(order: any) {
  if (isSupabase && supabaseAdmin) {
    // 1. Atomic Multi-Item Inventory Lock (Audit #12)
    // Runs inside a single Postgres transaction. Rolls back entirely if ANY item is out of stock.
    if (order.items && order.items.length > 0 && order.status !== 'quotation') {
       const settings = await getSettings();
       const isBulkTrackingOff = (settings.bulk_order_inventory_tracking !== true && settings.bulk_order_inventory_tracking !== 'true');

       const mappedItems = order.items
         .filter((i: any) => !i.id || !i.id.toString().startsWith('custom_gift_'))
         .filter((i: any) => !(isBulkTrackingOff && i.isB2B))
         .map((i: any) => ({
           id: i.product_id || (i.id ? i.id.split('-')[0] : i.id),
           variant: i.variant_name || undefined,
           isB2B: i.isB2B || false,
           quantity: i.quantity,
           isFlashSale: i.isFlashSale || false,
           product_name: i.product_name || i.name
       }));
       
       // Verify Tenant Ownership of Products to prevent Cross-Tenant Inventory Depletion
       const storeId = getTenantId();
       const productIds = [...new Set(mappedItems.map((i: any) => i.id))];
       if (storeId !== 'SUPER_ADMIN_BYPASS' && productIds.length > 0) {
           const { data: validProducts, error: valErr } = await supabaseAdmin.from(TABLES.PRODUCTS).select('id').in('id', productIds);
           if (valErr || !validProducts || validProducts.length !== productIds.length) {
               throw new Error('Unauthorized: One or more products do not exist or do not belong to your store.');
           }
       }

        const isTrackingOff = (settings.global_inventory_tracking !== true && settings.global_inventory_tracking !== 'true');
        const { data: invData, error: invError } = await supabaseAdmin.rpc('atomic_process_order_inventory', {
            p_items: mappedItems,
            p_store_id: storeId,
            p_skip_deduction: isTrackingOff
        });

       if (invError) {
           console.error('[Inventory Lock Error]', invError);
           throw new Error(`Inventory check failed: ${invError.message || invError.details}`);
       }
    }

    // 2. Save Order to Database
    const { data, error } = await supabaseAdmin.from(TABLES.ORDERS).upsert({
      order_id: order.orderId,
      customer: order.customer,
      items: order.items,
      amount: order.amount,
      discount: order.discount,
      shipping: order.shipping,
      subtotal: order.subtotal,
      coupon_code: order.couponCode,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      status: order.status || 'placed',
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id: order.razorpay_payment_id,
      phonepe_transaction_id: order.phonepe_transaction_id,
      affiliate_id: order.affiliate_id || null,
      affiliate_commission: order.affiliate_commission || 0
    }, { onConflict: 'order_id' }).select().single();
    
    if (error) {
      console.error('saveOrder Supabase error:', JSON.stringify(error));
      throw error;
    }
    
    // Commission & Affiliate processing are now deferred until the order is 'delivered'
    return { ...order, ...data, orderId: data.order_id, paymentMethod: data.payment_method };
  }
  // supabaseAdmin not available — supabase service role key missing in env vars
  if (isSupabase && !supabaseAdmin) {
    console.error('[CRITICAL] supabaseAdmin is null — SUPABASE_SERVICE_ROLE_KEY not set in environment variables!');
    throw new Error('Server configuration error: missing service role key');
  }
  return mockDb.saveOrder(order);
}


export async function saveMarketplaceOrder(masterOrder: any, subOrders: any[], options?: { skipInventory?: boolean, coupons?: string[], incrementCoupons?: boolean, incrementAffiliate?: boolean }) {
  if (isSupabase && supabaseAdmin) {
    // 1. Atomic Multi-Item Inventory Lock for ALL items (unless skipInventory is set)
const allItems = subOrders.flatMap(o => o.items);
    const settings = await getSettings();
    const isBulkTrackingOff = (settings.bulk_order_inventory_tracking !== true && settings.bulk_order_inventory_tracking !== 'true');

    // Fetch default location for the store to fallback to if items lack location_id
    let defaultLocationId = undefined;
    if (subOrders.length > 0 && subOrders[0].storeId) {
       const { data: locData } = await supabaseAdmin.from('locations').select('id').eq('store_id', subOrders[0].storeId).eq('is_default', true).limit(1);
       if (locData && locData.length > 0) defaultLocationId = locData[0].id;
       else {
          const { data: anyLoc } = await supabaseAdmin.from('locations').select('id').eq('store_id', subOrders[0].storeId).limit(1);
          if (anyLoc && anyLoc.length > 0) defaultLocationId = anyLoc[0].id;
       }
    }

    const mappedItems = allItems.length > 0 ? allItems
      .filter((i: any) => !i.id || !i.id.toString().startsWith('custom_gift_'))
      .filter((i: any) => !(isBulkTrackingOff && i.isB2B))
      .map((i: any) => ({
        id: i.product_id || (i.id ? i.id.split('-')[0] : i.id),
        variant: i.variant_name || undefined,
        variant_id: i.variant_id || undefined,
        location_id: i.location_id || defaultLocationId || undefined,
        isB2B: i.isB2B || false,
        quantity: i.quantity,
        isFlashSale: i.isFlashSale || false,
        product_name: i.product_name || i.name
    })) : [];

    const isTrackingOff = (settings.global_inventory_tracking !== true && settings.global_inventory_tracking !== 'true');

    let masterId = null;
    try {
      // TASK 4B FIX: Use atomic RPC for master and sub-orders insertion AND inventory
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('atomic_create_marketplace_order', {
        p_master_order: masterOrder,
        p_sub_orders: subOrders,
        p_items: mappedItems,
        p_skip_inventory: true, // Bypassed due to v37 migration signature change
        p_allow_negative_stock: masterOrder.paymentMethod !== 'cod' || isTrackingOff,
        p_skip_deduction: isTrackingOff,
        p_coupons: options?.coupons || [],
        p_increment_coupons: false, // Bypassed due to v37 migration signature change
        p_increment_affiliate: false // Always defer affiliate payouts until delivery
      });

      if (rpcErr) {
        console.error('[saveMarketplaceOrder RPC Error]', rpcErr);
        throw new Error(`Order creation failed: ${rpcErr.message || rpcErr.details}`);
      }

      // -------------------------------------------------------------
      // V37 TENANT ISOLATION FIX: Call the updated RPCs from JS
      // -------------------------------------------------------------
      if (!(options?.skipInventory)) {
        for (const sub of subOrders) {
           const subItems = mappedItems.filter((i: any) => sub.items.some((si: any) => (si.id === i.id || si.product_id === i.id)));
           if (subItems.length > 0) {
              const { error: invErr } = await supabaseAdmin.rpc('atomic_process_order_inventory', {
                 p_items: subItems,
                 p_store_id: sub.storeId,
                 p_skip_b2b_check: false,
                 p_skip_deduction: isTrackingOff
              });
              if (invErr) console.error('[v37 Inventory Error]', invErr);
           }
        }
      }

      if (options?.incrementCoupons && options.coupons && options.coupons.length > 0) {
        for (const coupon of options.coupons) {
           const { error: coupErr } = await supabaseAdmin.rpc('atomic_increment_coupon_usage', {
              p_code: coupon,
              p_store_id: subOrders[0]?.storeId,
              p_increment_amount: 1
           });
           if (coupErr) console.error('[v37 Coupon Error]', coupErr);
        }
      }
      // -------------------------------------------------------------

      masterId = rpcData.master_id;

      // Quick fallback to sync delivery_type and customer_id since RPC might not support them natively yet
      if (subOrders && Array.isArray(subOrders)) {
        for (const sub of subOrders) {
          let updatePayload: any = {};
          if (sub.delivery_type && sub.delivery_type !== 'standard') updatePayload.delivery_type = sub.delivery_type;
          if (masterOrder.customer_id) updatePayload.customer_id = masterOrder.customer_id;
          
          if (Object.keys(updatePayload).length > 0) {
            await supabaseAdmin.from(TABLES.ORDERS).update(updatePayload).eq('order_id', sub.orderId);
          }
          if (sub.delivery_type && sub.delivery_type !== 'standard') {
            await supabaseAdmin.from('fulfillments').update({ delivery_type: sub.delivery_type }).eq('order_id', sub.orderId);
          }
        }
      }

      // Post-insert JS side effects (Notifications, Platform Commissions)
      if (rpcData.sub_orders && Array.isArray(rpcData.sub_orders)) {
        for (const sub of rpcData.sub_orders) {
          // UI Notification moved to sendNotifications (after payment confirmation)
          // Note: Platform Commission is deferred until 'delivered' status
        }
      }
    } catch (dbError) {
      console.error('[saveMarketplaceOrder DB Error]', dbError);
      throw dbError;
    }

    return { success: true, masterId, orderId: masterOrder.displayId };
  }
  
  return mockDb.saveMarketplaceOrder(masterOrder, subOrders);
}


export async function getOrders(forceStoreId?: string) {
  const tenantId = forceStoreId || (() => { try { return getTenantId(); } catch { return 'global'; } })();
  
  // Use rawSupabaseAdmin if we need to bypass RLS, otherwise default supabase connection
  const client = forceStoreId ? rawSupabaseAdmin : (supabaseAdmin || supabase);
  if (isSupabase && client) {
    let query = client.from(TABLES.ORDERS)
      .select('*, master_orders(display_id, shipping_address), fulfillments(*, locations(name, q_commerce_enabled))')
      .order('created_at', { ascending: false });
      
    if (tenantId && tenantId !== 'SUPER_ADMIN_BYPASS' && tenantId !== 'global') {
      query = query.eq('store_id', tenantId);
    }
    let { data, error } = await query;
    
    if (error && error.code === 'PGRST200') {
      let fallbackQuery = client.from(TABLES.ORDERS)
        .select('*, master_orders(display_id, shipping_address)')
        .order('created_at', { ascending: false });
        
      if (tenantId && tenantId !== 'SUPER_ADMIN_BYPASS' && tenantId !== 'global') {
        fallbackQuery = fallbackQuery.eq('store_id', tenantId);
      }
      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) console.error('Supabase Orders Error:', error);
    return (data || [])
      .filter(o => !(o.status === 'placed' && o.payment_method?.toLowerCase() !== 'cod' && o.payment_status === 'pending'))
      .map(o => ({
      ...o,
      orderId:          o.order_id,
      masterOrderId:    o.master_orders?.display_id || null,
      address:          o.master_orders?.shipping_address || o.address || null,
      paymentMethod:    o.payment_method,
      source:           o.customer?.source || null,
      status:           o.customer?.source === 'quotation' ? 'quotation' : o.status,
      createdAt:        o.created_at,
      // Shipping label fields — mapped explicitly so invoice can access them
      awb:              o.awb_number || o.awb || null,
      courierPartner:   o.delivery_partner_name || o.courier_partner || null,
      routingCode:      o.routing_code || null,
      packageWeight:    o.package_weight || '0.50 KG',
      packageDimensions: o.package_dimensions || '13*13*13 CM',
      fulfillments:     o.fulfillments || [],
    }));
  }
  const orders = await mockDb.getOrders();
  return orders.filter((o: any) => !(o.paymentMethod !== 'cod' && o.paymentStatus === 'pending'));
}


export async function getOrdersByEmail(email: string) {
  const tenantId = (() => { try { return getTenantId(); } catch { return 'global'; } })();
  const client = supabaseAdmin || supabase;
  if (isSupabase && client) {
    let query = client.from(TABLES.ORDERS)
      .select('*, master_orders(display_id, shipping_address), fulfillments(*)')
      .eq('customer->>email', email)
      .order('created_at', { ascending: false });
      
    if (tenantId !== 'global') {
      query = query.eq('store_id', tenantId);
    }
    
    let { data, error } = await query;
      
    if (error && error.code === 'PGRST200') {
      let fallbackQuery = client.from(TABLES.ORDERS)
        .select('*, master_orders(display_id, shipping_address)')
        .eq('customer->>email', email)
        .order('created_at', { ascending: false });
        
      if (tenantId !== 'global') {
        fallbackQuery = fallbackQuery.eq('store_id', tenantId);
      }
      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Supabase Orders By Email Error:', error);
      return [];
    }
    return (data || [])
      .filter(o => !(o.status === 'placed' && o.payment_method?.toLowerCase() !== 'cod' && o.payment_status === 'pending'))
      .map(o => ({
      ...o,
      orderId:          o.order_id,
      masterOrderId:    o.master_orders?.display_id || null,
      address:          o.master_orders?.shipping_address || o.address || null,
      paymentMethod:    o.payment_method,
      source:           o.customer?.source || null,
      status:           o.customer?.source === 'quotation' ? 'quotation' : o.status,
      createdAt:        o.created_at,
      // Shipping label fields — mapped explicitly so invoice can access them
      awb:              o.awb_number || null,
      courierPartner:   o.courier_partner || null,
      routingCode:      o.routing_code || null,
      packageWeight:    o.package_weight || '0.50 KG',
      packageDimensions: o.package_dimensions || '13*13*13 CM',
      fulfillments:     o.fulfillments || [],
    }));
  }
  return [];
}


export async function getOrdersByPhone(phone: string) {
  const tenantId = (() => { try { return getTenantId(); } catch { return 'global'; } })();
  const client = supabaseAdmin || supabase;
  if (isSupabase && client) {
    let query = client.from(TABLES.ORDERS)
      .select('*, master_orders(display_id, shipping_address), fulfillments(*)')
      .eq('customer->>phone', phone)
      .order('created_at', { ascending: false });
      
    if (tenantId !== 'global') {
      query = query.eq('store_id', tenantId);
    }
    
    let { data, error } = await query;
      
    if (error && error.code === 'PGRST200') {
      let fallbackQuery = client.from(TABLES.ORDERS)
        .select('*, master_orders(display_id, shipping_address)')
        .eq('customer->>phone', phone)
        .order('created_at', { ascending: false });
        
      if (tenantId !== 'global') {
        fallbackQuery = fallbackQuery.eq('store_id', tenantId);
      }
      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Supabase Orders By Phone Error:', error);
      return [];
    }
    return (data || [])
      .filter(o => !(o.status === 'placed' && o.payment_method?.toLowerCase() !== 'cod' && o.payment_status === 'pending'))
      .map(o => ({
      ...o,
      orderId:          o.order_id,
      masterOrderId:    o.master_orders?.display_id || null,
      address:          o.master_orders?.shipping_address || o.address || null,
      paymentMethod:    o.payment_method,
      source:           o.customer?.source || null,
      status:           o.customer?.source === 'quotation' ? 'quotation' : o.status,
      createdAt:        o.created_at,
      awb:              o.awb_number || null,
      courierPartner:   o.courier_partner || null,
      routingCode:      o.routing_code || null,
      packageWeight:    o.package_weight || '0.50 KG',
      packageDimensions: o.package_dimensions || '13*13*13 CM',
      fulfillments:     o.fulfillments || [],
    }));
  }
  const orders = await mockDb.getOrders();
  return orders.filter((o: any) => o.customer?.phone === phone && !((o.status === 'placed') && (o.payment_method?.toLowerCase() !== 'cod' && o.paymentMethod?.toLowerCase() !== 'cod') && (o.payment_status === 'pending' || o.paymentStatus === 'pending')));
}

export async function getOrdersByCustomerId(customerId: string) {
  const tenantId = (() => { try { return getTenantId(); } catch { return 'global'; } })();
  const client = supabaseAdmin || supabase;
  if (isSupabase && client) {
    let query = client.from(TABLES.ORDERS)
      .select('*, master_orders(display_id, shipping_address), fulfillments(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
      
    if (tenantId !== 'global') {
      query = query.eq('store_id', tenantId);
    }
    
    let { data, error } = await query;
      
    if (error && error.code === 'PGRST200') {
      let fallbackQuery = client.from(TABLES.ORDERS)
        .select('*, master_orders(display_id, shipping_address)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
        
      if (tenantId !== 'global') {
        fallbackQuery = fallbackQuery.eq('store_id', tenantId);
      }
      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Supabase Orders By CustomerId Error:', error);
      return [];
    }
    return (data || [])
      .filter(o => !(o.status === 'placed' && o.payment_method?.toLowerCase() !== 'cod' && o.payment_status === 'pending'))
      .map(o => ({
      ...o,
      orderId:          o.order_id,
      masterOrderId:    o.master_orders?.display_id || null,
      address:          o.master_orders?.shipping_address || o.address || null,
      paymentMethod:    o.payment_method,
      createdAt:        o.created_at,
      awb:              o.awb_number || null,
      courierPartner:   o.courier_partner || null,
      routingCode:      o.routing_code || null,
      packageWeight:    o.package_weight || '0.50 KG',
      packageDimensions: o.package_dimensions || '13*13*13 CM',
      fulfillments:     o.fulfillments || [],
    }));
  }
  return [];
}

export async function updateOrderStatus(orderId: string, status: string, overrideStoreId?: string, fulfillmentId?: string) {
  if (isSupabase && supabaseAdmin) {
    let activeStoreId = overrideStoreId || getTenantId();
    
    // Fetch original order BEFORE update to check its current status
    const { data: originalOrder } = await supabaseAdmin.from(TABLES.ORDERS).select('*').eq('order_id', orderId).single();
    if (!originalOrder) throw new Error('Order not found');
    
    if (activeStoreId === 'SUPER_ADMIN_BYPASS') {
      activeStoreId = originalOrder.store_id;
    } else if (originalOrder.store_id !== activeStoreId) {
      throw new Error('Forbidden: Order does not belong to this store');
    }

    if (fulfillmentId) {
      // Fix: Ensure we only mutate fulfillments within the active tenant
      let query = supabaseAdmin.from('fulfillments').update({ status }).eq('id', fulfillmentId);
      if (activeStoreId && activeStoreId !== 'SUPER_ADMIN_BYPASS') {
        query = query.eq('store_id', activeStoreId);
      }
      await query;
      
      // Sprint 1.6 FIX: Aggregate statuses to prevent premature master order delivery
      const { data: allFulfillments } = await supabaseAdmin.from('fulfillments').select('status').eq('order_id', orderId);
      if (allFulfillments && allFulfillments.length > 0) {
        const allDelivered = allFulfillments.every((f: any) => f.status === 'delivered' || f.status === 'completed');
        const allCancelled = allFulfillments.every((f: any) => f.status === 'cancelled');
        const anyShipped = allFulfillments.some((f: any) => f.status === 'shipped' || f.status === 'delivered' || f.status === 'completed');
        
        let newMasterStatus = originalOrder.status;

        if (allCancelled) {
          newMasterStatus = 'cancelled';
        } else if (allDelivered) {
          newMasterStatus = 'delivered';
        } else if (anyShipped && originalOrder.status !== 'shipped' && originalOrder.status !== 'delivered') {
          newMasterStatus = 'shipped';
        }

        if (newMasterStatus !== originalOrder.status) {
          status = newMasterStatus; // Allow the rest of the function to update the master order
        } else {
          // Master status shouldn't change yet, return early to prevent redundant RPC calls and payout triggers
          return { ...originalOrder, orderId: originalOrder.order_id };
        }
      }
    }

    // R5 FIX: Use the single ACID state-machine transaction!
    // The latest RPC signature in v37 DOES accept p_store_id
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('atomic_update_order_status', {
        p_order_id: orderId,
        p_new_status: status,
        p_store_id: activeStoreId,
        p_skip_inventory: false
    });

    if (rpcError) throw rpcError;
    if (rpcData && rpcData.success === false) throw new Error(rpcData.error);

    // --- COMMISSION DEFERRAL LOGIC ---
    const wasDelivered = originalOrder.status === 'delivered' || originalOrder.status === 'completed';
    const isNowDelivered = status === 'delivered' || status === 'completed';

    if (!wasDelivered && isNowDelivered) {
        // 1. Process Affiliate Commission
        if (originalOrder.affiliate_id && originalOrder.affiliate_commission > 0) {
            await supabaseAdmin.rpc('increment_affiliate_earnings', {
                p_aff_id: originalOrder.affiliate_id,
                p_store_id: activeStoreId,
                p_amount: Math.abs(originalOrder.affiliate_commission) // Credit
            }).catch(e => console.error('[Affiliate Credit Error]', e));
        }

        // 2. Process Master Admin Commission
        await processOrderCommission(orderId, originalOrder.amount, activeStoreId, originalOrder.shipping || 0)
          .catch(e => console.error('[Master Commission Error]', e));
    }

    const isNowReturned = status === 'returned' || status === 'cancelled';
    if (wasDelivered && isNowReturned) {
        // 1. Reverse Affiliate Commission
        if (originalOrder.affiliate_id && originalOrder.affiliate_commission > 0) {
            await supabaseAdmin.rpc('increment_affiliate_earnings', {
                p_aff_id: originalOrder.affiliate_id,
                p_store_id: activeStoreId,
                p_amount: -Math.abs(originalOrder.affiliate_commission) // Debit (Refund)
            }).catch(e => console.error('[Affiliate Debit Error]', e));
        }

        // 2. Reverse Master Admin Commission
        await processOrderCommissionRefund(orderId, originalOrder.amount, activeStoreId)
          .catch(e => console.error('[Master Commission Refund Error]', e));

        // 3. Meta CAPI Refund Event
        try {
            const settings = await getSettings(activeStoreId);
            if (settings?.meta_pixel_id && settings?.meta_capi_token) {
                const { sendMetaCapiEvent, hashData } = await import('./tracking');
                const customer = typeof originalOrder.customer === 'string' ? JSON.parse(originalOrder.customer) : originalOrder.customer;
                const phone = customer?.phone || originalOrder.customer_phone;
                const email = customer?.email || originalOrder.customer_email;
                
                await sendMetaCapiEvent(settings.meta_pixel_id, settings.meta_capi_token, {
                    eventName: 'Refund',
                    eventTime: Date.now(),
                    eventId: orderId, // Match the exact orderId sent during Purchase
                    userData: {
                        em: hashData(email) ? [hashData(email) as string] : undefined,
                        ph: hashData(phone, 'phone') ? [hashData(phone, 'phone') as string] : undefined,
                    },
                    customData: {
                        value: originalOrder.amount,
                        currency: 'INR'
                    }
                });
            }
        } catch (e) {
            console.error('[CAPI Refund Error]', e);
        }
    }

    // Fetch the updated order back from DB to return to the caller
    const { data } = await supabaseAdmin.from(TABLES.ORDERS).select('*').eq('order_id', orderId).single();
    if (data) return { ...data, orderId: data.order_id };
    return null;
  }
  return mockDb.updateOrderStatus(orderId, status);
}

export async function updateOrderAwb(
  orderId: string,
  awb: string,
  extras?: {
    courier_partner?: string;
    routing_code?: string;
    package_weight?: string;
    package_dimensions?: string;
    label_url?: string;
    fulfillmentId?: string; // Sprint 1.6: Fulfillment level AWB
    rider_id?: string; // Q-Commerce Rider
  }
) {
  if (isSupabase && supabaseAdmin) {
    const orderUpdateData: Record<string, any> = {
      updated_at:       new Date().toISOString(),
      awb_number:       awb,
    };
    if (extras?.routing_code)       orderUpdateData.routing_code       = extras.routing_code;
    if (extras?.package_weight)     orderUpdateData.package_weight     = extras.package_weight;
    if (extras?.package_dimensions) orderUpdateData.package_dimensions = extras.package_dimensions;
    if (extras?.rider_id)           orderUpdateData.rider_id           = extras.rider_id;
    if (extras?.courier_partner)    orderUpdateData.delivery_partner_name = extras.courier_partner;

    let activeStoreId = getTenantId();
    if (activeStoreId === 'SUPER_ADMIN_BYPASS') {
      const { data: originalOrder } = await supabaseAdmin.from(TABLES.ORDERS).select('store_id').eq('order_id', orderId).single();
      if (originalOrder) activeStoreId = originalOrder.store_id;
    }

    if (extras?.fulfillmentId) {
      // Update specific fulfillment
      let fulfillmentQuery = supabaseAdmin.from('fulfillments')
        .update({
          awb_number: awb || null,
          courier_name: extras.courier_partner || null,
          tracking_url: extras.label_url || null,
          updated_at: orderUpdateData.updated_at
        })
        .eq('id', extras.fulfillmentId);
        
      if (activeStoreId !== 'SUPER_ADMIN_BYPASS') {
        fulfillmentQuery = fulfillmentQuery.eq('store_id', activeStoreId);
      }
      await fulfillmentQuery;
    }

    // Also update legacy order for backward compatibility
    let query = supabaseAdmin.from(TABLES.ORDERS)
      .update(orderUpdateData)
      .eq('order_id', orderId);
      
    if (activeStoreId !== 'SUPER_ADMIN_BYPASS') {
      query = query.eq('store_id', activeStoreId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return { ...data, orderId: data.order_id, awb };
  }
  return mockDb.updateOrderStatus(orderId, 'awb_updated');
}

// ── COUPONS ──────────────────────────────────────────────────────────

export async function getCoupons(forceStoreId?: string) {
  if (isSupabase && rawSupabase) {
    const client = forceStoreId ? rawSupabase : supabase;
    let query = client.from(TABLES.COUPONS).select('*');
    if (forceStoreId) {
      query = query.eq('store_id', forceStoreId);
    } else {
      query = query.eq('store_id', getTenantId());
    }
    const { data, error } = await query;
    if (error) console.error('Supabase Coupons Error:', error);
    return data || [];
  }
  return mockDb.getCoupons();
}

export async function saveCoupon(coupon: any) {
  if (isSupabase && supabaseAdmin) {
    const newCoupon = { id: 'CPN-' + Date.now(), ...coupon, used_count: 0, is_active: true };
    const { data, error } = await supabaseAdmin.from(TABLES.COUPONS).insert(newCoupon).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveCoupon(coupon);
}

export async function deleteCoupon(id: string) {
  if (isSupabase && supabaseAdmin) {
    const { error } = await supabaseAdmin.from(TABLES.COUPONS).delete().eq('id', id).eq('store_id', getTenantId());
    if (error) throw error;
    return true;
  }
  return mockDb.deleteCoupon(id);
}

export async function updateCoupon(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.COUPONS).update(updates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateCoupon(id, updates);
}

/**
 * Increment the used_count of a coupon after a successful order.
 */
export async function incrementCouponUsage(codes: string | string[]) {
  if (isSupabase && supabaseAdmin) {
    const codeArray = Array.isArray(codes) ? codes : [codes];
    const promises = [];
    for (const code of codeArray) {
      if (!code) continue;
      // C7 FIX: Use atomic SQL increment instead of read-modify-write
      const p = supabaseAdmin.rpc('atomic_increment_coupon_usage', { p_code: code.toUpperCase(), p_store_id: getTenantId(), p_delta: 1 })
        .then(({ error }: any) => { if (error) console.error(`[Coupon] RPC error for ${code}:`, error); })
        .catch(err => console.error(`[Coupon] Error incrementing coupon usage for ${code}:`, err));
      promises.push(p);
    }
    await Promise.allSettled(promises);
  }
}

export async function deductAffiliateEarnings(affiliate_id: string, amount: number) {
  if (isSupabase && supabaseAdmin) {
    await supabaseAdmin.rpc('increment_affiliate_earnings', { p_aff_id: affiliate_id, p_store_id: getTenantId(), p_amount: -amount });
  } else {
    await mockDb.deductAffiliateEarnings(affiliate_id, amount);
  }
}

export async function validateCoupon(codes: string | string[], subtotalOrSubtotalsByStore: number | Record<string, number>, customerPhone?: string, customerEmail?: string, customerId?: string): Promise<{
  valid: boolean;
  error?: string;
  discount?: number;
  coupons?: any[];
  coupon?: any;
}> {
  const codeArray = Array.isArray(codes) ? codes : (codes ? [codes] : []);
  if (codeArray.length === 0) return { valid: true, discount: 0, coupons: [] };

  if (isSupabase && supabase) {
    const upperCodes = codeArray.map(c => c.toUpperCase());
    let { data: coupons, error } = await supabase.from(TABLES.COUPONS).select('*').in('code', upperCodes).eq('is_active', true);
    
    // Process natively found coupons for affiliate links
    if (coupons && coupons.length > 0) {
      for (let i = 0; i < coupons.length; i++) {
        const c = coupons[i];
        if (c.affiliate_id) {
          const { data: affiliate } = await supabaseAdmin.from(TABLES.AFFILIATES).select('*').eq('id', c.affiliate_id).single();
          if (affiliate) {
            // Prevent self-referrals
            if (
              (customerEmail && affiliate.email && customerEmail.toLowerCase() === affiliate.email.toLowerCase()) ||
              (customerPhone && affiliate.phone && customerPhone === affiliate.phone)
            ) {
              return { valid: false, error: 'You cannot use your own referral code.' };
            }
            // Only credit affiliate if they are approved
            if (affiliate.is_approved === true) {
              c._is_affiliate = true;
              c._affiliate_id = affiliate.id;
              const { data: offers } = await supabaseAdmin.from(TABLES.AFFILIATE_OFFERS).select('*').eq('is_active', true).limit(1);
              if (offers && offers.length > 0) {
                c._commission_percentage = offers[0].commission_percentage;
                c.discount_value = offers[0].customer_discount_percentage;
                c.discount_type = 'percentage';
              } else {
                c._commission_percentage = 10;
              }
            }
          }
        }
      }
    }

    // Check if it's an affiliate code if no coupon found (Fallback)
    if ((error || !coupons || coupons.length === 0) && upperCodes.length === 1) {
      const affiliateCode = upperCodes[0];
      const { data: affiliate } = await supabaseAdmin.from(TABLES.AFFILIATES).select('*').eq('referral_code', affiliateCode).single();
      if (affiliate && affiliate.is_approved === true) {
        // Prevent self-referrals
        if (
          (customerEmail && affiliate.email && customerEmail.toLowerCase() === affiliate.email.toLowerCase()) ||
          (customerPhone && affiliate.phone && customerPhone === affiliate.phone)
        ) {
          return { valid: false, error: 'You cannot use your own referral code.' };
        }

        // Find an active offer
        const { data: offers } = await supabaseAdmin.from(TABLES.AFFILIATE_OFFERS).select('*').eq('is_active', true).limit(1);
        if (offers && offers.length > 0) {
          const offer = offers[0];
          // Mock a coupon object
          coupons = [{
            code: affiliateCode,
            discount_type: 'percentage',
            discount_value: offer.customer_discount_percentage,
            is_active: true,
            is_stackable: false,
            _is_affiliate: true,
            _affiliate_id: affiliate.id,
            _commission_percentage: offer.commission_percentage
          }];
          error = null;
        }
      }
    }

    if (error || !coupons || coupons.length === 0) return { valid: false, error: 'Invalid coupon code(s)' };

    // Check if multiple coupons are applied and if any of them is not stackable
    if (coupons.length > 1) {
      const nonStackable = coupons.find(c => !c.is_stackable);
      if (nonStackable) {
        return { valid: false, error: `Coupon ${nonStackable.code} cannot be combined with other coupons.` };
      }
    }

    let totalDiscount = 0;
    const now = new Date();
    const validCoupons = [];

    for (const coupon of coupons) {
      if (coupon.valid_from && new Date(coupon.valid_from) > now) return { valid: false, error: `Coupon ${coupon.code} is not yet active` };
      if (coupon.valid_until) {
        const expiryDate = new Date(coupon.valid_until);
        expiryDate.setHours(23, 59, 59, 999);
        if (expiryDate < now) return { valid: false, error: `Coupon ${coupon.code} has expired` };
      }
            if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return { valid: false, error: `Coupon usage limit reached for ${coupon.code}` };

      if (coupon.first_order_only) {
        if (customerId || customerPhone) {
          let query = supabaseAdmin.from(TABLES.ORDERS).select('*', { count: 'exact', head: true });
          if (customerId) {
            query = query.eq('customer_id', customerId);
          } else {
            query = query.eq('customer->>phone', customerPhone);
          }
          if (coupon.store_id) query = query.eq('store_id', coupon.store_id); // Apply tenant scope ONLY if it's a store coupon
          
          const { count, error } = await query;
          if (error) console.error("Error checking past orders:", error);
          if (count && count > 0) return { valid: false, error: `Coupon removed: ${coupon.code} is strictly for new customers. Our records show you have placed an order previously.` };
        }
      }

      if (coupon.one_time_per_user) {
        if (customerId || customerPhone) {
          let query = supabaseAdmin.from(TABLES.ORDERS).select('*', { count: 'exact', head: true }).ilike('coupon_code', `%${coupon.code}%`);
          if (customerId) {
            query = query.eq('customer_id', customerId);
          } else {
            query = query.eq('customer->>phone', customerPhone);
          }
          if (coupon.store_id) query = query.eq('store_id', coupon.store_id); // Apply tenant scope ONLY if it's a store coupon
          
          const { count, error } = await query;
          if (error) console.error("Error checking past coupon usage:", error);
          if (count && count > 0) return { valid: false, error: `Coupon ${coupon.code} can only be used once per customer. Our records show you have already used it.` };
        }
      }

      // TASK 2.2: Multi-tenant coupon subtotal calculation
      let discount = 0;
      let applicableTotal = 0;
      if (typeof subtotalOrSubtotalsByStore === 'number') {
        applicableTotal = subtotalOrSubtotalsByStore;
      } else {
        // If it's a map of subtotals by store
        if (coupon.store_id) {
          if (subtotalOrSubtotalsByStore[coupon.store_id] !== undefined) {
            applicableTotal = subtotalOrSubtotalsByStore[coupon.store_id];
          } else {
            return { valid: false, error: `Coupon ${coupon.code} is only valid for items from a specific store.` };
          }
        } else {
          // If the coupon has no store_id (platform coupon) or is an affiliate coupon, apply globally
          applicableTotal = Object.values(subtotalOrSubtotalsByStore).reduce((a, b) => a + b, 0);
        }
      }

      if (coupon.min_order_amount && applicableTotal < coupon.min_order_amount) return { valid: false, error: `Minimum order ₹${coupon.min_order_amount} required for ${coupon.code} on eligible items` };

      if (coupon.discount_type === 'percentage') {
        discount = Math.round((applicableTotal * coupon.discount_value) / 100);
        if (coupon.max_discount_amount) discount = Math.min(discount, coupon.max_discount_amount);
      } else {
        discount = coupon.discount_value; // Flat discounts apply as-is, but we could split them across stores if needed. For now, flat is flat.
        // Prevent flat discount from exceeding the applicable total!
        discount = Math.min(discount, applicableTotal);
      }
      totalDiscount += discount;
      coupon._calculated_discount = discount;
      validCoupons.push(coupon);
    }
    
    // Fallback for older singular `coupon` response property to avoid breaking existing code that expects it
    return { valid: true, discount: totalDiscount, coupons: validCoupons, coupon: validCoupons[0] };
  }
  return mockDb.validateCoupon(Array.isArray(codes) ? codes[0] : codes, typeof subtotalOrSubtotalsByStore === 'number' ? subtotalOrSubtotalsByStore : Object.values(subtotalOrSubtotalsByStore).reduce((a, b) => a + b, 0)); // mockDb not fully refactored for array
}

// ── HERO SLIDES ──────────────────────────────────────────────────────

export async function getHeroSlides(forceStoreId?: string) {
  if (isSupabase && rawSupabase) {
    const client = forceStoreId ? rawSupabase : supabase;
    let query = client.from(TABLES.HERO_SLIDES).select('*').order('sort_order', { ascending: true });
    if (forceStoreId) {
      query = query.eq('store_id', forceStoreId);
    } else {
      query = query.eq('store_id', getTenantId());
    }
    const { data, error } = await query;
    if (error) console.error('Supabase Hero Slides Error:', error);
    return optimizeDataUrls(data || []);
  }
  return optimizeDataUrls(mockDb.getHeroSlides ? mockDb.getHeroSlides() : []);
}

export async function saveHeroSlide(slide: any) {
  if (isSupabase && supabaseAdmin) {
    const newSlide = { id: 'slide-' + Date.now(), sort_order: 99, is_active: true, ...slide };
    const { data, error } = await supabaseAdmin.from(TABLES.HERO_SLIDES).insert(newSlide).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveHeroSlide ? mockDb.saveHeroSlide(slide) : slide;
}

export async function updateHeroSlide(id: string, updates: any, tenantId?: string) {
  if (isSupabase && supabaseAdmin) {
    let query = supabaseAdmin.from(TABLES.HERO_SLIDES).update(updates).eq('id', id).eq('store_id', getTenantId());
    if (tenantId && tenantId !== 'SUPER_ADMIN_BYPASS') query = query.eq('store_id', tenantId);
    
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateHeroSlide ? mockDb.updateHeroSlide(id, updates) : updates;
}

export async function deleteHeroSlide(id: string, tenantId?: string) {
  if (isSupabase && supabaseAdmin) {
    let query = supabaseAdmin.from(TABLES.HERO_SLIDES).delete().eq('id', id).eq('store_id', getTenantId());
    if (tenantId && tenantId !== 'SUPER_ADMIN_BYPASS') query = query.eq('store_id', tenantId);
    
    const { error } = await query;
    if (error) throw error;
    return true;
  }
  return true;
}

export async function reorderHeroSlides(order: { id: string; sort_order: number }[]) {
  if (isSupabase && supabaseAdmin) {
    await Promise.all(
      order.map(({ id, sort_order }) =>
        supabaseAdmin!.from(TABLES.HERO_SLIDES).update({ sort_order }).eq('id', id).eq('store_id', getTenantId())
      )
    );
    return true;
  }
  return true;
}

// ── BLOG POSTS ───────────────────────────────────────────────────────

export async function getBlogPosts(storeId?: string) {
  if (isSupabase && supabaseAdmin) {
    const tenantId = storeId || getTenantId();
    const { data, error } = await supabaseAdmin.from(TABLES.BLOG_POSTS).select('*').eq('store_id', tenantId).order('created_at', { ascending: false });
    if (error) console.error('Supabase Blog Error:', error);
    return data || [];
  }
  return mockDb.getBlogPosts();
}

export async function getBlogPostBySlug(slug: string, storeId?: string) {
  if (isSupabase && supabaseAdmin) {
    const tenantId = storeId || getTenantId();
    const { data, error } = await supabaseAdmin.from(TABLES.BLOG_POSTS).select('*').eq('store_id', tenantId).eq('slug', slug).single();
    if (error || !data) {
      return mockDb.getBlogPostBySlug(slug);
    }
    return data;
  }
  return mockDb.getBlogPostBySlug(slug);
}

export async function saveBlogPost(post: any) {
  if (isSupabase && supabaseAdmin) {
    const newPost = { id: 'BLOG-' + Date.now(), ...post };
    const { data, error } = await supabaseAdmin.from(TABLES.BLOG_POSTS).insert(newPost).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveBlogPost(post);
}

export async function updateBlogPost(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.BLOG_POSTS)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateBlogPost(id, updates);
}

// ── CUSTOMERS ────────────────────────────────────────────────────────

export async function getCustomers() {
  if (isSupabase && supabaseAdmin) {
    const tenantId = (() => { try { return getTenantId(); } catch { return 'global'; } })();
    let query = supabaseAdmin.from(TABLES.CUSTOMERS).select('*').order('created_at', { ascending: false });
    
    if (tenantId !== 'global') {
      query = query.eq('store_id', tenantId);
    }
    
    const { data, error } = await query;
    if (error) console.error('Supabase Customers Error:', error);
    return data || [];
  }
  return mockDb.getCustomers();
}

export async function getCustomerByPhone(phone: string) {
  const client = supabaseAdmin || supabase;
  if (isSupabase && client) {
    const { data, error } = await client.from(TABLES.CUSTOMERS).select('*').eq('phone', phone).single();
    if (error) return null;
    return data;
  }
  return mockDb.getCustomerByPhone(phone);
}

export async function getCustomerByEmail(email: string, forceStoreId?: string) {
  const client = forceStoreId ? rawSupabaseAdmin : (supabaseAdmin || supabase);
  if (isSupabase && client) {
    let query = client.from(TABLES.CUSTOMERS).select('*').eq('email', email);
    if (forceStoreId && forceStoreId !== 'SUPER_ADMIN_BYPASS') query = query.eq('store_id', forceStoreId);
    const { data, error } = await query.single();
    if (error) return null;
    return data;
  }
  // mock fallback: scan all customers
  const all = await mockDb.getCustomers();
  return all.find((c: any) => c.email === email) || null;
}

export async function getCustomerById(id: string) {
  const client = supabaseAdmin || supabase;
  if (isSupabase && client) {
    const { data, error } = await client.from(TABLES.CUSTOMERS).select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }
  const all = await mockDb.getCustomers();
  return all.find((c: any) => c.id === id) || null;
}

export async function saveCustomer(customer: any) {
  if (isSupabase && supabaseAdmin) {
    const { new_phone, new_email, ...updateData } = customer;
    
    let existing;
    if (customer.id) {
      const res = await supabaseAdmin.from(TABLES.CUSTOMERS).select('*').eq('id', customer.id).single();
      existing = res.data;
    } else if (customer.phone) {
      const res = await supabaseAdmin.from(TABLES.CUSTOMERS).select('*').eq('phone', customer.phone).single();
      existing = res.data;
    } else if (customer.email) {
      const res = await supabaseAdmin.from(TABLES.CUSTOMERS).select('*').eq('email', customer.email).single();
      existing = res.data;
    }

    if (new_phone) updateData.phone = new_phone;
    if (new_email) updateData.email = new_email;

    if (existing) {
      const { data, error } = await supabaseAdmin.from(TABLES.CUSTOMERS)
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single();
      if (error) throw error;
      return data;
    }
    const newCustomer = { id: 'CUST-' + Date.now(), ...updateData, total_orders: 0 };
    const { data, error } = await supabaseAdmin.from(TABLES.CUSTOMERS).insert(newCustomer).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveCustomer(customer);
}

// ── SAVED ADDRESSES ──────────────────────────────────────────────────

export async function getAddressesByPhone(phone: string, forceStoreId?: string) {
  const client = forceStoreId ? rawSupabaseAdmin : (supabaseAdmin || supabase);
  if (isSupabase && client) {
    let query = client.from(TABLES.ADDRESSES).select('*').eq('phone', phone).order('created_at', { ascending: false });
    // Make addresses global across stores
    // if (forceStoreId && forceStoreId !== 'SUPER_ADMIN_BYPASS') {
    //   query = query.eq('store_id', forceStoreId);
    // }
    const { data, error } = await query;
    if (error) console.error('Supabase Addresses Error:', error);
    return (data || []).map(addr => ({ ...addr, street_address: addr.street_address || addr.street, contact_phone: addr.phone }));
  }
  return mockDb.getAddressesByPhone(phone);
}

export async function getAddressesByCustomerId(customerId: string, forceStoreId?: string) {
  const client = forceStoreId ? rawSupabaseAdmin : (supabaseAdmin || supabase);
  if (isSupabase && client) {
    let query = client.from(TABLES.ADDRESSES).select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) console.error('Supabase Addresses Error:', error);
    return (data || []).map(addr => ({ ...addr, street_address: addr.street_address || addr.street, contact_phone: addr.phone }));
  }
  return [];
}

export async function saveAddress(address: any, forceStoreId?: string) {
  const client = forceStoreId ? rawSupabaseAdmin : (supabaseAdmin || supabase);
  if (isSupabase && client) {
    const { id, ...updates } = address;
    const addrToSave = { ...updates };
    if (addrToSave.street_address && !addrToSave.street) {
       addrToSave.street = addrToSave.street_address;
       delete addrToSave.street_address;
    }
    delete addrToSave.contact_phone;
    delete addrToSave.label;
    
    if (id && !id.startsWith('DERIVED')) {
       const { data, error } = await client.from(TABLES.ADDRESSES).update(addrToSave).eq('id', id).select().single();
       if (error) throw error;
       return { ...data, street_address: data.street_address || data.street };
    } else {
       addrToSave.id = 'ADDR-' + Date.now() + Math.floor(Math.random()*1000);
       const { data, error } = await client.from(TABLES.ADDRESSES).insert(addrToSave).select().single();
       if (error) throw error;
       return { ...data, street_address: data.street_address || data.street };
    }
  }
  return mockDb.saveAddress(address);
}

export async function deleteAddress(id: string) {
  const client = supabaseAdmin || supabase;
  if (isSupabase && client) {
    const { error } = await client.from(TABLES.ADDRESSES).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  return mockDb.deleteAddress(id);
}

// ── NOTIFICATIONS ────────────────────────────────────────────────────

export async function getNotifications(adminId?: string) {
  if (isSupabase && supabaseAdmin) {
    let query = supabaseAdmin.from(TABLES.NOTIFICATIONS).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false });
    
    // If adminId is provided, filter out notifications cleared by this admin
    if (adminId) {
      query = query.not('cleared_by', 'cs', `{"${adminId}"}`);
    }
    
    const { data, error } = await query;
    if (error) console.error('Supabase Notifications Error:', error);
    
    // Compute is_read based on read_by array if adminId is present
    if (data && adminId) {
      return data.map(n => ({
        ...n,
        is_read: n.read_by ? n.read_by.includes(adminId) : false
      }));
    }
    
    return data || [];
  }
  return mockDb.getNotifications();
}

export async function addNotification(type: string, referenceId: string, message: string, storeId?: string) {
  if (isSupabase && supabaseAdmin) {
    const newNotif: any = { id: 'NOTIF-' + Date.now(), type, reference_id: referenceId, message, read_by: [], cleared_by: [] };
    newNotif.store_id = storeId || getTenantId();
    const { data, error } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).insert(newNotif).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.addNotification(type, referenceId, message, storeId);
}

export async function markNotificationRead(id: string, adminId?: string) {
  if (isSupabase && supabaseAdmin) {
    if (adminId) {
      const { error } = await supabaseAdmin.rpc('mark_notification_read', { notif_id: id, admin_id: adminId });
      if (error) throw error;
      return true;
    } else {
      // Fallback to legacy global read (if called from a place without adminId)
      const { data, error } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).update({ is_read: true }).eq('id', id).eq('store_id', getTenantId()).select().single();
      if (error) throw error;
      return data;
    }
  }
  return mockDb.markNotificationRead(id);
}

export async function markAllNotificationsRead(adminId?: string, storeId?: string) {
  if (isSupabase && supabaseAdmin) {
    const targetStoreId = storeId || getTenantId();
    if (adminId && targetStoreId) {
       const { error } = await supabaseAdmin.rpc('mark_all_notifications_read_for_staff', { target_store_id: targetStoreId, admin_id: adminId });
       if (error) throw error;
       return true;
    } else {
       // Fallback to legacy global mark all read
       const { error } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).update({ is_read: true }).eq('is_read', false).eq('store_id', targetStoreId);
       if (error) throw error;
       return true;
    }
  }
  return mockDb.markAllNotificationsRead();
}

export async function clearAllNotifications(adminId?: string, storeId?: string) {
  if (isSupabase && supabaseAdmin) {
    const targetStoreId = storeId || getTenantId();
    if (adminId && targetStoreId) {
      const { error } = await supabaseAdmin.rpc('clear_all_notifications_for_staff', { target_store_id: targetStoreId, admin_id: adminId });
      if (error) throw error;
      return true;
    } else {
      const { error } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).delete().eq('store_id', targetStoreId).neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
      if (error) throw error;
      return true;
    }
  }
  return mockDb.clearAllNotifications();
}


// ── CATEGORIES ───────────────────────────────────────────────────────

export async function getCategories(forceStoreId?: string) {
  const cacheKey = `categories_${forceStoreId || 'global'}`;
  const cached = getCached<any[]>(cacheKey, 60000);
  if (cached) return cached;

  if (isSupabase && rawSupabase) {
    const client = forceStoreId ? rawSupabase! : supabase;
    const tenantId = forceStoreId || getTenantId();
    let query = client.from(TABLES.CATEGORIES).select('*').eq('store_id', tenantId).order('display_order', { ascending: true, nullsFirst: false }).order('name');
    
    // Get product counts concurrently
    let prodQuery = client.from(TABLES.PRODUCTS).select('category').eq('store_id', tenantId);
    
    // Execute both in parallel!
    const [ { data, error }, { data: prods } ] = await Promise.all([query, prodQuery]);
    
    if (error) console.error('Supabase Categories Error:', error);
    if (!data || data.length === 0) return setCached(cacheKey, []);
    
    const countMap: Record<string, number> = {};
    (prods || []).forEach((p: any) => { if (p.category) countMap[p.category] = (countMap[p.category] || 0) + 1; });
    return setCached(cacheKey, optimizeDataUrls(data.map((c: any) => ({ ...c, product_count: countMap[c.slug] || 0 }))));
  }
  return setCached(cacheKey, optimizeDataUrls(await mockDb.getCategories()));
}

// Returns categories as a nested tree (top-level items with `children` arrays)
export async function getCategoryTree(forceStoreId?: string) {
  const all = await getCategories(forceStoreId);
  const map: Record<string, any> = {};
  const tree: any[] = [];

  // First pass: index by id
  all.forEach((c: any) => { map[c.id] = { ...c, children: [] }; });

  // Second pass: build tree
  all.forEach((c: any) => {
    const node = map[c.id];
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(node);
    } else {
      tree.push(node);
    }
  });

  // For top-level categories, add up child product counts
  tree.forEach((parent: any) => {
    parent.total_product_count = parent.product_count + parent.children.reduce((sum: number, ch: any) => sum + (ch.product_count || 0), 0);
  });

  return tree;
}

export async function saveCategory(category: any) {
  clearCached('categories_all');
  clearCached(`categories_${getTenantId()}`);
  if (isSupabase && supabaseAdmin) {
    const newCat = {
      id: 'CAT-' + Date.now(),
      name: category.name,
      slug: category.slug,
      description: category.description || null,
      image: category.image || null,
      parent_id: category.parent_id || null,
      display_order: category.display_order ?? 0,
      store_id: getTenantId(),
    };
    const { data, error } = await supabaseAdmin.from(TABLES.CATEGORIES).insert(newCat).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveCategory(category);
}

export async function updateCategory(id: string, updates: any) {
  clearCached('categories_all');
  clearCached(`categories_${getTenantId()}`);
  if (isSupabase && supabaseAdmin) {
    // Only pass known fields to avoid Supabase errors
    const safeUpdates: any = {};
    if (updates.name !== undefined) safeUpdates.name = updates.name;
    if (updates.slug !== undefined) safeUpdates.slug = updates.slug;
    if (updates.description !== undefined) safeUpdates.description = updates.description;
    if (updates.image !== undefined) safeUpdates.image = updates.image;
    if (updates.parent_id !== undefined) safeUpdates.parent_id = updates.parent_id || null;
    if (updates.display_order !== undefined) safeUpdates.display_order = updates.display_order;
    const { data, error } = await supabaseAdmin.from(TABLES.CATEGORIES).update(safeUpdates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateCategory(id, updates);
}

export async function deleteCategory(id: string) {
  clearCached('categories_all');
  clearCached(`categories_${getTenantId()}`);
  if (isSupabase && supabaseAdmin) {
    const { error } = await supabaseAdmin.from(TABLES.CATEGORIES).delete().eq('id', id).eq('store_id', getTenantId());
    if (error) throw error;
    return true;
  }
  return mockDb.deleteCategory(id);
}

export async function assignProductsToCategory(categorySlug: string, productSlugs: string[]) {
  clearCached('categories_all');
  clearCached(`categories_${getTenantId()}`);
  if (isSupabase && supabase) {
    if (productSlugs.length > 0) {
      // Set given products to this category
      await supabase.from(TABLES.PRODUCTS).update({ category: categorySlug }).in('slug', productSlugs).eq('store_id', getTenantId());
      // Unassign products previously in this category but NOT in the new list
      await supabase.from(TABLES.PRODUCTS).update({ category: 'uncategorized' }).eq('category', categorySlug).not('slug', 'in', `(${productSlugs.join(',')})`).eq('store_id', getTenantId());
    } else {
      // No products selected — remove all from this category
      await supabase.from(TABLES.PRODUCTS).update({ category: 'uncategorized' }).eq('category', categorySlug).eq('store_id', getTenantId());
    }
    return true;
  }
  return mockDb.assignProductsToCategory(categorySlug, productSlugs);
}


// ── FLASH SALES ──────────────────────────────────────────────────────
// NOTE: The flash_sales table uses camelCase column names (startDate, endDate, salePrice etc.)

// Normalize a DB row to ensure consistent camelCase keys throughout the app
function normalizeFlashSale(s: any) {
  if (!s) return s;
  return {
    id: s.id,
    product: s.product,
    variant: s.variant,
    originalPrice: Number(s.originalPrice ?? 0),
    regularPrice: Number(s.regularPrice ?? 0),
    salePrice: Number(s.salePrice ?? 0),
    startDate: s.startDate ?? '',
    endDate: s.endDate ?? '',
    status: s.status ?? 'scheduled',
    stockType: s.stockType ?? 'none',
    totalStock: s.totalStock ?? null,
    soldStock: s.soldStock ?? 0,
    fakePercentage: s.fakePercentage ?? null,
    image: s.image ?? '',
    created_at: s.created_at,
  };
}

// Sanitize sale object before writing to DB — keeps camelCase, removes undefined/NaN
function prepareFlashSale(sale: any) {
  const out: any = {};
  const fields = ['product','variant','originalPrice','salePrice','startDate','endDate','status','stockType','totalStock','soldStock','fakePercentage','image'];
  for (const f of fields) {
    if (sale[f] !== undefined) {
      out[f] = sale[f];
    }
  }
  // Sanitize numeric fields
  if (Number.isNaN(out.totalStock)) out.totalStock = null;
  if (Number.isNaN(out.soldStock)) out.soldStock = 0;
  if (Number.isNaN(out.fakePercentage)) out.fakePercentage = null;
  if (out.originalPrice !== undefined) out.originalPrice = Number(out.originalPrice);
  if (out.regularPrice !== undefined) out.regularPrice = Number(out.regularPrice);
  if (out.salePrice !== undefined) out.salePrice = Number(out.salePrice);
  return out;
}

export async function getFlashSales(forceStoreId?: string): Promise<any[]> {
  const cacheKey = `flash_sales_${forceStoreId || 'global'}`;
  const cached = getCached<any[]>(cacheKey, 60000); // 60s cache
  if (cached) return cached;

  let sales = [];
  if (isSupabase && rawSupabase) {
    const client = forceStoreId ? rawSupabase : supabase;
    let query = client.from(TABLES.FLASH_SALES).select('*').order('created_at', { ascending: false });
    if (forceStoreId) {
      query = query.eq('store_id', forceStoreId);
    }
    const { data, error } = await query;
    if (error) console.error('Supabase Flash Sales Error:', error);
    sales = (data || []).map(normalizeFlashSale);
  } else {
    sales = await mockDb.getFlashSales();
  }
  return setCached(cacheKey, optimizeDataUrls(sales));
}

export async function saveFlashSale(sale: any) {
  if (isSupabase && supabaseAdmin) {
    const dbSale = { id: 'FS-' + Date.now(), ...prepareFlashSale(sale) };
    const { data, error } = await supabaseAdmin.from(TABLES.FLASH_SALES).insert(dbSale).select().single();
    if (error) throw error;
    return normalizeFlashSale(data);
  }
  return mockDb.saveFlashSale(sale);
}

export async function updateFlashSale(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const dbUpdates = prepareFlashSale(updates);
    // Also allow direct status update which might not be in fields list
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    const { data, error } = await supabaseAdmin.from(TABLES.FLASH_SALES).update(dbUpdates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return normalizeFlashSale(data);
  }
  return mockDb.updateFlashSale(id, updates);
}

export async function deleteFlashSale(id: string) {
  if (isSupabase && supabaseAdmin) {
    const { error } = await supabaseAdmin.from(TABLES.FLASH_SALES).delete().eq('id', id).eq('store_id', getTenantId());
    if (error) throw error;
    return true;
  }
  return mockDb.deleteFlashSale(id);
}



/**
 * Fetches real-time stock limits for an active flash sale from the database directly,
 * bypassing the 60-second getProducts cache to prevent TOCTOU overselling.
 */
export async function getLiveFlashSaleStock(productName: string, variantName: string, forceStoreId?: string): Promise<{ total: number, sold: number, type: string } | null> {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.FLASH_SALES)
      .select('total_stock, sold_stock, stock_type, variant')
      .eq('product', productName)
      .eq('store_id', forceStoreId || getTenantId())
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .limit(10);
      
    if (error || !data || data.length === 0) return null;
    
    // Find the specific variant sale, or fallback to 'all'
    let sale = data.find(s => s.variant === variantName);
    if (!sale) sale = data.find(s => !s.variant || s.variant === 'all' || s.variant === '');
    
    if (sale) {
      return {
        total: sale.total_stock || 0,
        sold: sale.sold_stock || 0,
        type: sale.stock_type || 'none'
      };
    }
  }
  return null;
}



// ── STAFF ACCOUNTS ───────────────────────────────────────────────────

export async function getStaff() {
  const cacheKey = `staff_${getTenantId()}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.STAFF).select('*').eq('store_id', getTenantId());
    if (error) {
      console.error('Supabase Staff Error:', error);
      throw error; // Throw to surface error
    }
    return setCached(cacheKey, data || []);
  }
  return setCached(cacheKey, await mockDb.getStaff());
}

export async function saveStaffMember(member: any) {
  if (isSupabase) {
    if (!supabaseAdmin) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables. Admin operations require this key.');
    const newMember = { id: 'STAFF-' + Date.now(), ...member, is_active: true, store_id: getTenantId() };
    const { data, error } = await supabaseAdmin.from(TABLES.STAFF).insert(newMember).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveStaffMember(member);
}

export async function updateStaffMember(id: string, updates: any) {
  clearCache('staff');
  if (isSupabase) {
    if (!supabaseAdmin) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.');
    const { data, error } = await supabaseAdmin.from(TABLES.STAFF).update(updates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateStaffMember(id, updates);
}

export async function deleteStaffMember(id: string) {
  clearCache('staff');
  if (isSupabase) {
    if (!supabaseAdmin) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.');
    const { error } = await supabaseAdmin.from(TABLES.STAFF).delete().eq('id', id).eq('store_id', getTenantId());
    if (error) throw error;
    return true;
  }
  return mockDb.deleteStaffMember(id);
}

// ── PASSWORD RECOVERY REQUESTS ────────────────────────────────────────

export async function getPasswordRecoveryRequests(forAdminLevel?: number) {
  if (isSupabase && supabaseAdmin) {
    let query = supabaseAdmin.from(TABLES.PASSWORD_RECOVERY_REQUESTS).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false });
    // If not original super admin, only show requests from staff below their level
    if (forAdminLevel !== undefined && forAdminLevel > 0) {
      query = query.gt('requester_level', forAdminLevel);
    }
    const { data, error } = await query;
    if (error) console.error('Recovery Requests Error:', error);
    return data || [];
  }
  return [];
}

export async function createPasswordRecoveryRequest(request: any) {
  if (isSupabase && supabaseAdmin) {
    const newReq = {
      id: 'PWR-' + Date.now(),
      ...request,
      status: 'pending',
      created_at: new Date().toISOString(),
      store_id: getTenantId()
    };
    const { data, error } = await supabaseAdmin.from(TABLES.PASSWORD_RECOVERY_REQUESTS).insert(newReq).select().single();
    if (error) throw error;
    return data;
  }
  return { id: 'PWR-mock-' + Date.now(), ...request, status: 'pending' };
}

export async function updatePasswordRecoveryRequest(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.PASSWORD_RECOVERY_REQUESTS).update(updates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return null;
}



// ── SHIPPING ZONES ───────────────────────────────────────────────────

export async function getShippingZones() {
  if (isSupabase && supabase) {
    const { data, error } = await supabase.from(TABLES.SHIPPING_ZONES).select('*').eq('store_id', getTenantId()).order('name');
    if (error) console.error('Supabase Shipping Error:', error);
    return data || [];
  }
  return mockDb.getShippingZones();
}

export async function saveShippingZone(zone: any) {
  if (isSupabase && supabaseAdmin) {
    const newZone = { id: 'SHIP-' + Date.now(), ...zone, store_id: getTenantId() };
    const { data, error } = await supabaseAdmin.from(TABLES.SHIPPING_ZONES).insert(newZone).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveShippingZone(zone);
}

export async function updateShippingZone(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.SHIPPING_ZONES).update(updates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateShippingZone(id, updates);
}

export async function deleteShippingZone(id: string) {
  if (isSupabase && supabaseAdmin) {
    const { error } = await supabaseAdmin.from(TABLES.SHIPPING_ZONES).delete().eq('id', id).eq('store_id', getTenantId());
    if (error) throw error;
    return true;
  }
  return mockDb.deleteShippingZone(id);
}

// ── REVIEWS ──────────────────────────────────────────────────────────

export async function getAdminReviews() {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.REVIEWS).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false }).limit(1000);
    if (error) console.error('Supabase Admin Reviews Error:', error);
    return data || [];
  }
  return mockDb.getReviews();
}



export async function getAllApprovedReviews(forceStoreId?: string) {
  const cacheKey = `all_approved_reviews_${forceStoreId || 'global'}`;
  const cached = getCached<any[]>(cacheKey, 60000);
  if (cached) return cached;

  if (isSupabase && (forceStoreId ? rawSupabase : supabase)) {
    const client = forceStoreId ? rawSupabase! : supabase;
    let query = client.from(TABLES.REVIEWS).select('*').eq('status', 'approved').eq('store_id', forceStoreId || getTenantId()).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) console.error('Supabase Approved Reviews Error:', error);
    return setCached(cacheKey, data || []);
  }
  const allReviews = await mockDb.getReviews();
  const approved = allReviews.filter((r: any) => r.status === 'approved');
  return setCached(cacheKey, approved);
}

export async function getApprovedProductReviews(slug: string, forceStoreId?: string) {
  const cacheKey = `reviews_${slug}_${forceStoreId || 'global'}`;
  const cached = getCached<any[]>(cacheKey, 60000);
  if (cached) return cached;

  if (isSupabase && (forceStoreId ? rawSupabase : supabase)) {
    const client = forceStoreId ? rawSupabase! : supabase;
    let query = client.from(TABLES.REVIEWS).select('*').eq('product_slug', slug).eq('status', 'approved').eq('store_id', forceStoreId || getTenantId()).order('created_at', { ascending: false }).limit(20);
    const { data, error } = await query;
    if (error) console.error('Supabase Approved Reviews Error:', error);
    return setCached(cacheKey, data || []);
  }
  const allReviews = await mockDb.getReviews();
  const approved = allReviews.filter((r: any) => r.product_slug === slug && r.status === 'approved').slice(0, 20);
  return setCached(cacheKey, approved);
}

export async function hasUserReviewedProduct(product_slug: string, phone: string) {
  if (isSupabase && supabaseAdmin) {
    const { data } = await supabaseAdmin.from(TABLES.REVIEWS).select('id').eq('product_slug', product_slug).eq('phone', phone).eq('store_id', getTenantId());
    return data && data.length > 0;
  }
  return false;
}

export async function saveReview(review: any) {
  if (isSupabase && supabaseAdmin) {
    const newReview = { id: 'REV-' + Date.now(), ...review, status: 'pending', store_id: getTenantId() };
    const { data, error } = await supabaseAdmin.from(TABLES.REVIEWS).insert(newReview).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveReview(review);
}

export async function updateReview(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.REVIEWS).update(updates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateReview(id, updates);
}

// ── FEEDBACK & INQUIRIES ─────────────────────────────────────────────

export async function getFeedback() {
  if (isSupabase && supabase) {
    const { data, error } = await supabase.from(TABLES.FEEDBACK).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false });
    if (error) console.error('Supabase Feedback Error:', error);
    return data || [];
  }
  return mockDb.getFeedback();
}

export async function saveFeedback(feedback: any) {
  if (isSupabase && supabaseAdmin) {
    const newFb = { id: 'FB-' + Date.now(), ...feedback, status: feedback.status || 'open', store_id: getTenantId() };
    const { data, error } = await supabaseAdmin.from(TABLES.FEEDBACK).insert(newFb).select().single();
    if (error) throw error;
    
    // Trigger notification
    await addNotification('feedback', data.id, `New feedback received from ${feedback.name || 'Guest'}`);
    
    return data;
  }
  return mockDb.saveFeedback(feedback);
}

export async function updateFeedback(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.FEEDBACK).update(updates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateFeedback(id, updates);
}

export async function getBulkInquiries() {
  if (isSupabase && supabase) {
    const { data, error } = await supabase.from(TABLES.BULK_INQUIRIES).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false });
    if (error) console.error('Supabase Bulk Inquiries Error:', error);
    return data || [];
  }
  return mockDb.getBulkInquiries();
}

export async function saveBulkInquiry(inquiry: any) {
  if (isSupabase && supabaseAdmin) {
    const newInq = { id: 'BULK-' + Date.now(), ...inquiry, status: 'new', store_id: getTenantId() };
    const { data, error } = await supabaseAdmin.from(TABLES.BULK_INQUIRIES).insert(newInq).select().single();
    if (error) throw error;
    
    // Trigger notification
    await addNotification('bulk_order', data.id, `New bulk order inquiry from ${inquiry.name || 'Guest'}`);
    
    return data;
  }
  return mockDb.saveBulkInquiry(inquiry);
}

export async function updateBulkInquiry(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.BULK_INQUIRIES).update(updates).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateBulkInquiry(id, updates);
}

export async function getEnrichedAddresses(phone: string, forceStoreId?: string) {
  const addresses = await getAddressesByPhone(phone, forceStoreId);
  
  // Normalize string by removing all punctuation, spaces, and making lowercase for strict deduplication
  const normalizeAddr = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const existingStrings = new Set(addresses.map((a: any) => 
    normalizeAddr(`${a.street_address || a.street} ${a.city || ''} ${a.state || ''} ${a.pincode || ''}`)
  ));

  const myOrders = await getOrdersByPhone(phone);

  myOrders.forEach((o: any) => {
    const oAddr = o.customer?.address || o.shipping?.address;
    if (oAddr && !existingStrings.has(normalizeAddr(oAddr))) {
      const parts = oAddr.split(',').map((s: string) => s.trim());
      if (parts.length >= 3) {
        const statePin = parts[parts.length - 1].split('-');
        const state = statePin[0]?.trim() || '';
        const pincode = statePin[1]?.trim() || '';
        const city = parts[parts.length - 2];
        const street = parts.slice(0, parts.length - 2).join(', ');
        
        addresses.push({
          id: `DERIVED-${Date.now()}-${Math.random()}`,
          label: 'PAST ORDER',
          name: o.customer?.name || '',
          contact_phone: o.customer?.phone || phone,
          street_address: street,
          city: city,
          state: state,
          pincode: pincode
        });
        existingStrings.add(normalizeAddr(oAddr));
      } else {
        // Fallback for weirdly formatted strings
        addresses.push({
          id: `DERIVED-${Date.now()}-${Math.random()}`,
          label: 'PAST ORDER',
          name: o.customer?.name || '',
          contact_phone: o.customer?.phone || phone,
          street_address: oAddr,
          city: '',
          state: '',
          pincode: ''
        });
        existingStrings.add(normalizeAddr(oAddr));
      }
    }
  });

  return addresses;
}

export async function saveAddressIfNew(phone: string, addressData: any, forceStoreId?: string, customerId?: string) {
  if (!phone || !addressData || (!addressData.street_address && !addressData.address)) return;
  
  try {
    const existing = await getAddressesByPhone(phone, forceStoreId);
    
    const isDuplicate = existing.some((addr: any) => 
      (addr.street_address?.toLowerCase().trim() === (addressData.street_address || addressData.address)?.toLowerCase().trim()) &&
      addr.pincode === addressData.pincode
    );
    
    if (!isDuplicate) {
      await saveAddress({
        customer_id: customerId || addressData.customer_id || null,
        phone,
        name: addressData.name || '',
        contact_phone: addressData.contact_phone || phone,
        street_address: addressData.street_address || addressData.address,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        label: addressData.label || 'HOME'
      }, forceStoreId);
    }
  } catch (err) {
    console.error('[Database] saveAddressIfNew error:', err);
  }
}

// ── NEW PHASE 1 ADDITIONS ─────────────────────────────────────
export async function decrementInventoryStock(items: any[]) {
  if (!isSupabase || !supabaseAdmin) return;
  for (const item of items) {
    if (item.is_free_gift) continue;
    try {
      // NOTE: Flash sale stock is managed atomically by atomic_process_flash_sale_inventory
      // inside the checkout RPC. Do NOT call any flash sale RPC here to avoid double-deduction.

      // Decrement main inventory (only if track_inventory is true, but rpc can handle that)
      const { data: prod } = await supabaseAdmin.from(TABLES.PRODUCTS).select('track_inventory').eq('id', item.product_id).single();
      if (prod && prod.track_inventory) {
         if (item.variant_name && item.variant_name !== 'Default') {
            await supabaseAdmin.rpc('decrement_variant_stock', {
              p_product_id: item.product_id,
              p_variant_name: item.variant_name,
              p_store_id: getTenantId(),
              p_qty: item.quantity
            });
         } else {
            await supabaseAdmin.rpc('decrement_product_stock', {
              p_product_id: item.product_id,
              p_store_id: getTenantId(),
              p_qty: item.quantity
            });
         }
      }
    } catch (e) {
      console.error('[Inventory Sync] Failed to decrement stock for', item.product_name, e);
    }
  }
}

export async function getActiveMilestone(forceStoreId?: string) {
  if (isSupabase && rawSupabase) {
    try {
      const client = forceStoreId ? rawSupabase : supabase;
      let query = client.from(TABLES.MILESTONE_OFFERS).select('*').eq('is_active', true).eq('store_id', forceStoreId || getTenantId());
      const { data, error } = await query.single();
      if (!error && data) return data;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getCrossSellProducts(excludeSlugs: string[] = [], forceStoreId?: string) {
  try {
    const allProductsRaw = await getProducts(forceStoreId);
    
    // Process products exactly like index.astro: remove hidden variants, check active status
    const allProducts = allProductsRaw.map((p: any) => ({
      ...p,
      variants: p.variants?.filter((v: any) => !v.is_hidden) || []
    })).filter((p: any) => p.is_active !== false && p.variants.length > 0);

    const available = allProducts.filter((p: any) => 
      !excludeSlugs.includes(p.slug) &&
      p.variants.some((v: any) => !v.is_out_of_stock)
    );
    
    return available.slice(0, 5).map((p: any) => {
      // Find the first variant that is NOT out of stock, fallback to the first available variant
      const variant = p.variants.find((v: any) => !v.is_out_of_stock) || p.variants[0];
      return {
        id: `${p.id}-${variant.id || 'v1'}`,
        name: p.name,
        slug: p.slug,
      hsn_code: p.hsn_code,
      gst_rate: p.gst_rate,
        price: variant.price,
        mrp: variant.mrp || variant.price,
        image: p.image || `/products/${p.slug}.webp`,
        weight: variant.weight
      };
    });
  } catch (error) {
    console.error("Error in getCrossSellProducts:", error);
    return [];
  }
}

// ── ACTIVITY LOGS & LINEAGE (BRANCH-BASED HIERARCHY) ─────────

/**
 * Gets the direct and indirect descendants of a given staff member ID.
 * Returns an array of their IDs.
 */
export async function getStaffDescendantIds(ancestorId: string): Promise<string[]> {
  // Optimized: Try database-level recursive CTE first
  if (isSupabase && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_staff_descendants', { ancestor_id: ancestorId });
      if (!error && data) {
        return data.map((row: any) => row.id);
      }
    } catch (rpcErr) {
      console.warn('[Hierarchy] RPC get_staff_descendants not available, falling back to in-memory BFS:', rpcErr);
    }
  }

  // Fallback: In-memory BFS (works without RPC function)
  const allStaff = await getStaff();
  const descendants = new Set<string>();
  const queue = [ancestorId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = allStaff.filter((s: any) => s.created_by === currentId);
    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return Array.from(descendants);
}

/**
 * Checks if targetId is a descendant of ancestorId (i.e. ancestorId created targetId, or created the person who created targetId, etc.)
 */
export async function isStaffInDescendantBranch(ancestorId: string, targetId: string): Promise<boolean> {
  // Super Admin (root) has access to everyone implicitly, but the logic should handle checking via API.
  // Actually, we'll let the API route do the "isOriginalSuperAdmin" check.
  const descendants = await getStaffDescendantIds(ancestorId);
  return descendants.includes(targetId);
}

export async function logActivity(actorId: string, actorName: string, action: string, targetId: string, details: any, req?: Request) {
  if (isSupabase && supabaseAdmin) {
    let ip = '';
    if (req) {
      ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    }
    const log = {
      actor_id: actorId,
      actor_name: actorName,
      action,
      target_id: targetId,
      details: details,
      ip_address: ip,
      store_id: getTenantId()
    };
    await supabaseAdmin.from(TABLES.ACTIVITY_LOGS).insert(log);
  } else {
    // Basic mock implementation (fire and forget)
    console.log(`[ACTIVITY LOG] ${actorName} (${actorId}) performed ${action} on ${targetId}`);
  }
}

export async function getActivityLogs(viewerId: string, isOriginalSuperAdmin: boolean) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.ACTIVITY_LOGS).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false }).limit(200);
    if (error) {
      console.error('Activity Logs Error:', error);
      return [];
    }
    const logs = data || [];
    
    if (isOriginalSuperAdmin) return logs;
    
    // Filter to only show logs where the actor is the viewer OR in the viewer's descendant branch
    const descendants = await getStaffDescendantIds(viewerId);
    const allowedIds = new Set([viewerId, ...descendants]);
    
    return logs.filter((log: any) => allowedIds.has(log.actor_id));
  }
  return [];
}

export async function clearActivityLogs(viewerId: string, isOriginalSuperAdmin: boolean) {
  if (isSupabase && supabaseAdmin) {
    if (isOriginalSuperAdmin) {
      await supabaseAdmin.from(TABLES.ACTIVITY_LOGS).delete().eq('store_id', getTenantId()).neq('id', '00000000-0000-0000-0000-000000000000'); // delete all for store
    } else {
      const descendants = await getStaffDescendantIds(viewerId);
      const allowedIds = [viewerId, ...descendants];
      await supabaseAdmin.from(TABLES.ACTIVITY_LOGS).delete().eq('store_id', getTenantId()).in('actor_id', allowedIds);
    }
  }
}



// ── RATE LIMITING ────────────────────────────────────────────────────────────

/**
 * Checks if an action is within rate limits.
 * @param identifier Phone or Email
 * @param authType 'phone' or 'email'
 * @param actionType 'send_otp'
 * @param maxRequests e.g. 3
 * @param windowMinutes e.g. 60
 * @returns true if allowed, false if blocked
 */
export async function checkRateLimit(
  identifier: string,
  authType: 'phone' | 'email',
  actionType: 'send_otp',
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  // If maxRequests or windowMinutes is not defined or 0, rate limiting is disabled
  if (!maxRequests || maxRequests <= 0 || !windowMinutes || windowMinutes <= 0) {
    return true;
  }

  if (isSupabase && supabaseAdmin) {
    try {
      // Clean up old limits first (optional but good practice)
      const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      // Check current record
      const { data, error } = await supabaseAdmin
        .from(TABLES.AUTH_RATE_LIMITS)
        .select('*')
        .eq('identifier', identifier)
        .eq('auth_type', authType)
        .eq('action_type', actionType)
        .gte('first_request_at', cutoff)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Log but allow if DB fails
        console.error('[RateLimit] Fetch error:', error);
        return true;
      }

      if (data) {
        if (data.attempts >= maxRequests) {
          return false; // Blocked
        } else {
          // Increment attempts
          await supabaseAdmin
            .from(TABLES.AUTH_RATE_LIMITS)
            .update({
              attempts: data.attempts + 1,
              last_request_at: new Date().toISOString()
            })
            .eq('id', data.id);
          return true;
        }
      } else {
        // Create new record
        await supabaseAdmin
          .from(TABLES.AUTH_RATE_LIMITS)
          .insert({
            identifier,
            auth_type: authType,
            action_type: actionType,
            attempts: 1,
            first_request_at: new Date().toISOString(),
            last_request_at: new Date().toISOString()
          });
        return true;
      }
    } catch (err) {
      console.error('[RateLimit] Exception:', err);
      return true; // fail open
    }
  }

  // If mock DB, allow
  return true;
}

export async function incrementFailedOtpAttempt(
  identifier: string,
  authType: 'phone' | 'email',
  maxAttempts: number
): Promise<boolean> {
  if (isSupabase && supabaseAdmin) {
    try {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data, error } = await supabaseAdmin
        .from(TABLES.AUTH_RATE_LIMITS)
        .select('*')
        .eq('identifier', identifier)
        .eq('auth_type', authType)
        .eq('action_type', 'verify_otp_failed')
        .gte('first_request_at', cutoff)
        .single();

      if (data) {
        if (data.attempts >= maxAttempts) return false;
        
        await supabaseAdmin
          .from(TABLES.AUTH_RATE_LIMITS)
          .update({
            attempts: data.attempts + 1,
            last_request_at: new Date().toISOString()
          })
          .eq('id', data.id);
        
        return (data.attempts + 1) <= maxAttempts;
      } else {
        await supabaseAdmin
          .from(TABLES.AUTH_RATE_LIMITS)
          .insert({
            identifier,
            auth_type: authType,
            action_type: 'verify_otp_failed',
            attempts: 1,
            first_request_at: new Date().toISOString(),
            last_request_at: new Date().toISOString()
          });
        return true;
      }
    } catch (err) {
      console.error('[RateLimit Failed OTP] Exception:', err);
      return true;
    }
  }
  return true;
}

export async function clearFailedOtpAttempts(
  identifier: string,
  authType: 'phone' | 'email'
) {
  if (isSupabase && supabaseAdmin) {
    try {
      await supabaseAdmin
        .from(TABLES.AUTH_RATE_LIMITS)
        .delete()
        .eq('identifier', identifier)
        .eq('auth_type', authType)
        .eq('action_type', 'verify_otp_failed');
    } catch (err) {}
  }
}

// ── AFFILIATES ───────────────────────────────────────────────────────

export async function getAffiliates() {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.AFFILIATES).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false });
    if (error) console.error('Supabase Affiliates Error:', error);
    return data || [];
  }
  return mockDb.getAffiliates();
}

export async function getAffiliateByEmail(email: string) {
  const client = supabaseAdmin || supabase;
  if (isSupabase && client) {
    const { data, error } = await client.from(TABLES.AFFILIATES).select('*').eq('email', email).eq('store_id', getTenantId()).single();
    if (error) return null;
    return data;
  }
  const all = await mockDb.getAffiliates();
  return all.find((a: any) => a.email === email) || null;
}

export async function saveAffiliate(affiliate: any) {
  let saved: any;
  if (isSupabase && supabaseAdmin) {
    const newAffiliate = { id: 'AFF-' + Date.now(), ...affiliate, total_earnings: 0, paid_earnings: 0, store_id: getTenantId() };
    const { data, error } = await supabaseAdmin.from(TABLES.AFFILIATES).insert(newAffiliate).select().single();
    if (error) throw error;
    saved = data;
  } else {
    saved = await mockDb.saveAffiliate(affiliate);
  }

  // Auto-generate Coupon
  try {
    const offers = await getAffiliateOffers();
    const defaultOffer = offers.find((o: any) => o.is_active) || { customer_discount_percentage: 10 };
    await saveCoupon({
      code: saved.referral_code,
      discount_type: 'percentage',
      discount_value: defaultOffer.customer_discount_percentage,
      min_order_amount: 0,
      max_discount_amount: 0,
      usage_limit: 0,
      valid_from: null,
      valid_until: null,
      first_order_only: false,
      is_public: false,
      is_stackable: false,
      affiliate_id: saved.id
    });
  } catch (e) {
    console.error("Auto coupon generation failed:", e);
  }

  return saved;
}

export async function updateAffiliate(id: string, updates: any) {
  let updated: any;
  let oldAffiliate: any = null;
  const all = await getAffiliates();
  oldAffiliate = all.find((a: any) => a.id === id);

  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.AFFILIATES).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    updated = data;
  } else {
    updated = await mockDb.updateAffiliate(id, updates);
  }

  // Auto-rename Coupon if code changed
  if (oldAffiliate && updates.referral_code && updates.referral_code !== oldAffiliate.referral_code) {
    try {
      const allCoupons = await getCoupons();
      const existingCoupon = allCoupons.find((c: any) => c.affiliate_id === id);
      if (existingCoupon) {
        await updateCoupon(existingCoupon.id, { code: updates.referral_code });
      }
    } catch (e) {
      console.error("Auto coupon rename failed:", e);
    }
  }

  return updated;
}

export async function deleteAffiliate(id: string) {
  if (isSupabase && supabaseAdmin) {
    const { error } = await supabaseAdmin.from(TABLES.AFFILIATES).delete().eq('id', id).eq('store_id', getTenantId());
    if (error) throw error;
    return true;
  }
  return mockDb.deleteAffiliate(id);
}

// ── AFFILIATE OFFERS ─────────────────────────────────────────────────

export async function getAffiliateOffers() {
  const client = supabaseAdmin || supabase;
  if (isSupabase && client) {
    const { data, error } = await client.from(TABLES.AFFILIATE_OFFERS).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false });
    if (error) console.error('Supabase Affiliate Offers Error:', error);
    return data || [];
  }
  return mockDb.getAffiliateOffers();
}

export async function saveAffiliateOffer(offer: any) {
  if (isSupabase && supabaseAdmin) {
    const newOffer = { id: 'OFFER-' + Date.now(), ...offer, store_id: getTenantId() };
    const { data, error } = await supabaseAdmin.from(TABLES.AFFILIATE_OFFERS).insert(newOffer).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.saveAffiliateOffer(offer);
}

export async function updateAffiliateOffer(id: string, updates: any) {
  if (isSupabase && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from(TABLES.AFFILIATE_OFFERS).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('store_id', getTenantId()).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.updateAffiliateOffer(id, updates);
}

export async function deleteAffiliateOffer(id: string) {
  if (isSupabase && supabaseAdmin) {
    const { error } = await supabaseAdmin.from(TABLES.AFFILIATE_OFFERS).delete().eq('id', id).eq('store_id', getTenantId());
    if (error) throw error;
    return true;
  }
  return mockDb.deleteAffiliateOffer(id);
}

// ── PAYOUTS ──────────────────────────────────────────────────────────

export async function getPayouts() {
  if (isSupabase && supabase) {
    const { data, error } = await supabase.from(TABLES.PAYOUTS).select('*').eq('store_id', getTenantId()).order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase Payouts Error:', error);
      return [];
    }
    return data || [];
  }
  return mockDb.getPayouts();
}

export async function savePayout(payout: any) {
  if (isSupabase && supabaseAdmin) {
    const newPayout = { id: 'PAY-' + Date.now(), ...payout, store_id: getTenantId() };
    const { data, error } = await supabaseAdmin.from(TABLES.PAYOUTS).insert(newPayout).select().single();
    if (error) throw error;
    return data;
  }
  return mockDb.savePayout(payout);
}
