-- ==============================================================================
-- VyaparPe V4 Subscription Plans Migration
-- ==============================================================================

INSERT INTO subscription_plans (id, name, slug, plan_type, price_monthly, price_yearly, commission_rate, max_products, min_ad_spend_daily, features) VALUES
('00000000-0000-0000-0000-000000000007', 'Ad-Spend Partner', 'ad-spend', 'commission', 0, 0, 3.0, 500, 1000, '{"custom_domain": false}'::jsonb),
('00000000-0000-0000-0000-000000000008', 'Lifetime Ownership', 'lifetime', 'onetime', 0, 2000, 1.0, 10000, 0, '{"custom_domain": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    commission_rate = EXCLUDED.commission_rate,
    price_yearly = EXCLUDED.price_yearly;

-- Also let's update the existing ones to make sure commission_rate is set properly
UPDATE subscription_plans SET commission_rate = 5.0 WHERE id = '00000000-0000-0000-0000-000000000005'; -- Free Tier
UPDATE subscription_plans SET commission_rate = 2.0 WHERE id = '00000000-0000-0000-0000-000000000006'; -- Growth Plan
