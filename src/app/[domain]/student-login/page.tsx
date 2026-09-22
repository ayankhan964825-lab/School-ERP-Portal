"use client";

import { useState, useTransition, use } from "react";
import { authenticateStaff } from "@/app/actions/auth"; // We can reuse the action, or create authenticateStudent
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GraduationCap, KeyRound, Loader2, Mail } from "lucide-react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-emerald-500/25"
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      ) : (
        "Login to Student Portal"
      )}
    </Button>
  );
}

export default function StudentLoginPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = use(params);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    formData.append("subdomain", domain);
    
    // Using the same backend logic, though students won't have multiple schools
    const result = await authenticateStaff(null, formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.type === "MULTI_TENANT_SELECT") {
       setError("Students cannot belong to multiple schools. Contact admin.");
    } else if (result?.success) {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 flex items-center justify-center p-4">
      {/* Background Ornaments */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-teal-100/50 blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden z-10 border border-emerald-100 relative">
        <div className="p-8 pb-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Student Portal</h1>
          <p className="text-emerald-100 text-sm font-medium">Welcome back, Scholar!</p>
        </div>

        <div className="p-8 pt-8">
          <form action={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 block">Student Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    name="email" 
                    type="email" 
                    placeholder="student@school.com" 
                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 block">Password</label>
                  <a href="#" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Forgot?</a>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    name="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-600"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-lg text-center animate-in shake">
                {error}
              </div>
            )}

            <SubmitButton />

          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400">
            Powered by SchoolSaathi
          </p>
        </div>
      </div>
    </div>
  );
}
