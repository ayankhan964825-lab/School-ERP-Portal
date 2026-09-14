-- Migration V33: Secure Activity Logs for Multi-Tenancy
-- Adds store_id to activity logs to prevent cross-tenant data leakage.

BEGIN;

-- 1. Add store_id to activity_logs (if it is a table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.activity_logs 
    ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES stores(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_activity_logs_store_id ON public.activity_logs(store_id);
  END IF;
END $$;

-- 2. Add store_id to admin_activity_logs (in case activity_logs is a view over it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.admin_activity_logs 
    ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES stores(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_store_id ON public.admin_activity_logs(store_id);
  END IF;
END $$;

-- 3. Add store_id to super_admin_activity_logs (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'super_admin_activity_logs' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.super_admin_activity_logs 
    ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES stores(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_super_admin_activity_logs_store_id ON public.super_admin_activity_logs(store_id);
  END IF;
END $$;

-- 4. Recreate the activity_logs VIEW only if it is already a view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs' AND table_schema = 'public' AND table_type = 'VIEW') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.activity_logs;';
    EXECUTE 'CREATE VIEW public.activity_logs AS SELECT * FROM public.admin_activity_logs;';
  END IF;
END $$;

COMMIT;
