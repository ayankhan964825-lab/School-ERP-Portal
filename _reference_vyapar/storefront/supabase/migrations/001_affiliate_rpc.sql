-- Supabase RPC Migration Script for Atomic Affiliate Earnings Increments
-- Run this script in the Supabase SQL Editor.

create or replace function increment_affiliate_earnings(aff_id uuid, amount numeric)
returns void as $$
begin
  update affiliates 
  set total_earnings = coalesce(total_earnings, 0) + amount 
  where id = aff_id;
end;
$$ language plpgsql;
