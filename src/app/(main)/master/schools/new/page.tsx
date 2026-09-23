"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, Loader2, Mail, KeyRound } from "lucide-react";
import Link from "next/link";
import { provisionNewSchool, checkSubdomainAvailability } from "@/app/actions/onboarding";

export default function NewSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const schoolName = formData.get("schoolName") as string;
    const adminEmail = formData.get("adminEmail") as string;
    const adminPassword = formData.get("adminPassword") as string;
    
    // Auto-generate subdomain from school name (lowercase, alphanumeric)
    const rawSubdomain = schoolName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const subdomain = rawSubdomain.substring(0, 30);

    try {
      const availCheck = await checkSubdomainAvailability(subdomain);
      if (!availCheck.available) {
        setError(availCheck.error || "Subdomain is unavailable.");
        setLoading(false);
        return;
      }

      const result = await provisionNewSchool({
        schoolName,
        email: adminEmail,
        password: adminPassword,
        subdomain,
        plan: "PREMIUM"
      });
      
      if (!result.success) {
        setError(result.error || "Failed to onboard school.");
      } else {
        router.push("/master/schools");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/master/schools">
          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Onboard New School</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Provision a new isolated database instance and admin account.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">School Details</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">School Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                <Input 
                  name="schoolName" 
                  placeholder="e.g. Delhi Public School" 
                  className="pl-10 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-school-primary-500"
                  required
                />
              </div>
              <p className="text-xs text-slate-500">The subdomain will be auto-generated from the name.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Super Admin Account</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                <Input 
                  name="adminEmail" 
                  type="email" 
                  placeholder="principal@school.com" 
                  className="pl-10 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-school-primary-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Admin Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                <Input 
                  name="adminPassword" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-school-primary-500"
                  required
                  minLength={8}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button 
              type="submit" 
              className="bg-school-primary hover:bg-school-primary-600 text-white min-w-[150px] shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning...</>
              ) : (
                "Provision School"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
