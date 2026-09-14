import os

files = [
    "FINAL_MULTI_TENANT_MIGRATION.sql",
    "migration_v10_inventory.sql",
    "migration_v12_rls_hardening.sql",
    "migration_v13_composite_constraints.sql",
    "migration_v14_customer_identity_fix.sql",
    "migration_v15_rpc_tenant_isolation.sql",
    "migration_v16_affiliate_fraud_patch.sql",
    "migration_v17_coupon_one_time_use.sql",
    "migration_v17_multi_warehouse.sql",
    "migration_v18_riders.sql",
    "migration_v18_coupon_increment_fix.sql",
    "migration_v19_multi_dimensional_variants.sql",
    "migration_v22_missing_columns.sql",
    "storefront/final_master_audit_fixes_v9.sql",
    "storefront/final_master_audit_fixes_v11.sql",
    "storefront/final_master_audit_fixes_v12.sql"
]

with open('00_VYAPARPE_SUPABASE_MASTER.sql', 'w', encoding='utf-8') as outfile:
    outfile.write("-- ==========================================\n")
    outfile.write("-- VYAPARPE SUPABASE MASTER DEPLOYMENT SCRIPT\n")
    outfile.write("-- Generated automatically. Copy and paste this into Supabase SQL Editor.\n")
    outfile.write("-- This is the ONLY script you need to run to deploy the entire backend!\n")
    outfile.write("-- ==========================================\n\n")
    
    for fname in files:
        if os.path.exists(fname):
            outfile.write(f"\n\n-- ==========================================\n")
            outfile.write(f"-- SOURCED FROM: {fname}\n")
            outfile.write(f"-- ==========================================\n\n")
            with open(fname, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())
        else:
            print(f"Warning: {fname} not found!")

print("Successfully generated 00_VYAPARPE_SUPABASE_MASTER.sql")
