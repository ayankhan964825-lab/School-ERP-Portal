/// <reference types="astro/client" />

/**
 * VyaparPe Multi-Tenant Store Record
 * Represents a provisioned store from the `stores` table.
 */
interface StoreRecord {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  status: 'active' | 'suspended' | 'deleted';
  plan_id: string | null;
  commission_rate: number;
  owner_email: string | null;
  owner_phone: string | null;
  domain_status: 'active' | 'pending' | null;
  theme_config: Record<string, any> | null;
  created_at: string;
}

declare namespace App {
  interface Locals {
    /** The resolved store UUID. Null if no store is matched. */
    storeId: string | null;
    /** Full store record for the current tenant. Null for marketplace / super-admin. */
    store: StoreRecord | null;
    /** True when request is on the marketplace storefront (vyaparpe.com). */
    isMarketplace: boolean;
  }
}
