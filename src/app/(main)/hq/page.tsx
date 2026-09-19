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
      className="w-full h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-medium transition-all shadow-lg"
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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Hacker/Developer Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[20%] left-[30%] w-px h-[50vh] bg-gradient-to-b from-transparent via-green-500 to-transparent" />
         <div className="absolute top-[10%] right-[30%] w-px h-[70vh] bg-gradient-to-b from-transparent via-green-500 to-transparent" />
      </div>

      <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-800 relative">
        <div className="p-8 pb-6 border-b border-slate-800 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
            <Code2 className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-white">ERPVyapar HQ</h1>
          <p className="text-slate-400 text-sm font-mono">Restricted Developer Access</p>
        </div>

        <div className="p-8 pt-8">
          <form action={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300 block">System Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input 
                    name="email" 
                    type="email" 
                    placeholder="master@erpvyapar.com" 
                    className="pl-10 h-12 bg-slate-950 border-slate-800 text-white focus-visible:ring-green-500 placeholder:text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300 block">Passcode</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input 
                    name="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 bg-slate-950 border-slate-800 text-white focus-visible:ring-green-500 placeholder:text-slate-700"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950 border border-red-900 text-red-400 text-sm font-medium rounded-lg text-center font-mono">
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
