export interface Store {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  status: string;
  created_at: string;
  plan_id?: string | null;
  commission_rate?: number | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  domain_status?: string | null;
  subscription_plans?: { name: string } | { name: string }[] | null;
}

export interface Order {
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
  store_id: string;
}

export interface Wallet {
  store_id: string;
  balance: number;
  stores?: {
    name?: string;
    owner_phone?: string;
    status?: string;
  } | any;
  last_updated?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  is_active?: boolean;
  sort_order?: number;
  price_monthly?: number;
  price_yearly?: number;
  price_onetime?: number;
  commission_rate?: number;
  max_products?: string | number;
  max_staff?: string | number;
  features?: any;
}

export interface ServiceRequest {
  id: string;
  service_type: string;
  notes?: string | null;
  price: number;
  created_at: string;
  status: string;
  stores?: { name?: string; domain?: string } | any;
}

export interface SuperAdminRole {
  id: string;
  name: string;
  permissions?: any;
}

export interface SuperAdminStaff {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  is_active: boolean;
  role_id?: string | null;
  super_admin_roles?: { name?: string } | any;
}
export interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  reference_id?: string;
  description?: string;
  created_at: string;
  stores?: { name?: string } | any;
}

export interface PayoutRequest {
  id: string;
  amount: number;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  created_at: string;
  stores?: { name?: string; id?: string } | any;
}

export interface MarketplaceListing {
  id: string;
  status: string;
  created_at: string;
  products?: { id?: string; name?: string; image?: string; price?: number; original_price?: number; category?: string } | any;
  stores?: { id?: string; name?: string } | any;
}
