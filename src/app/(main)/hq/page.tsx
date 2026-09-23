"use client";

import { useState } from "react";
import { authenticateMaster } from "@/app/actions/hqAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2, Mail, Code2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      className="w-full h-12 bg-school-primary hover:bg-school-primary-600 text-white rounded-xl font-medium transition-all shadow-sm"
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      ) : (
        "Access HQ"
      )}
    </Button>
  );
}

export default function HQLoginPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    const result = await authenticateMaster(null, formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      window.location.href = "/master"; // Redirect to master admin dashboard
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4">
      {/* Background Graphic */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[20%] left-[30%] w-px h-[50vh] bg-gradient-to-b from-transparent via-school-primary-500 to-transparent" />
         <div className="absolute top-[10%] right-[30%] w-px h-[70vh] bg-gradient-to-b from-transparent via-school-primary-500 to-transparent" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-200 dark:border-slate-800 relative">
        <div className="p-8 pb-6 border-b border-slate-200 dark:border-slate-800 text-center">
          <div className="mx-auto w-16 h-16 bg-school-primary/10 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-school-primary/20 dark:border-slate-700">
            <Code2 className="w-8 h-8 text-school-primary-600 dark:text-school-primary-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">SchoolSaathi HQ</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">System Administrator Access</p>
        </div>

        <div className="p-8 pt-8">
          <form action={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">System Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <Input 
                    name="email" 
                    type="email" 
                    placeholder="master@schoolsaathi.com" 
                    className="pl-10 h-12 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-school-primary-500 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">Passcode</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <Input 
                    name="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-school-primary-500 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center">
                {error}
              </div>
            )}

            <SubmitButton />

          </form>
        </div>
      </div>
    </div>
  );
}
