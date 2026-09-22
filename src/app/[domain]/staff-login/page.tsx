"use client";

import { useState, useTransition, use } from "react";
import { authenticateStaff } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, KeyRound, Loader2, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { useFormStatus } from "react-dom";

// The submit button handles its own pending state automatically
function SubmitButton({ isSelectionMode }: { isSelectionMode: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/25"
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      ) : isSelectionMode ? (
        "Confirm Selection"
      ) : (
        "Sign In Securely"
      )}
    </Button>
  );
}

export default function StaffLoginPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = use(params);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [savedEmail, setSavedEmail] = useState("");
  const [savedPassword, setSavedPassword] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    formData.append("subdomain", domain);
    
    // If we are in selection mode, append the schoolId the user clicked
    if (isSelectionMode) {
      if (!selectedSchoolId) {
        setError("Please select a school to continue.");
        return;
      }
      formData.append("schoolId", selectedSchoolId);
      formData.set("email", savedEmail);
      formData.set("password", savedPassword);
    } else {
      // Save credentials in case we need to re-submit them after selection
      setSavedEmail(formData.get("email") as string);
      setSavedPassword(formData.get("password") as string);
    }

    const result = await authenticateStaff(null, formData);

    if (result?.error) {
      setError(result.error);
      setIsSelectionMode(false); // Reset on error
    } else if (result?.type === "MULTI_TENANT_SELECT") {
      // The backend detected this email owns multiple schools!
      setSchools(result.schools);
      setIsSelectionMode(true);
    } else if (result?.success) {
      // Success! Next.js will handle redirect based on middleware or we can force it here
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background Ornaments */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-indigo-100/50 blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden z-10 border border-slate-100 relative">
        <div className="p-8 pb-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Administration Panel</h1>
          <p className="text-blue-100 text-sm font-medium">Secure Access required</p>
        </div>

        <div className="p-8 pt-8">
          <form action={handleSubmit} className="space-y-6">
            
            {!isSelectionMode ? (
              // --- NORMAL LOGIN MODE ---
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input 
                      name="email" 
                      type="email" 
                      placeholder="teacher@school.com" 
                      className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700 block">Password</label>
                    <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Forgot?</a>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input 
                      name="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-600"
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              // --- MULTI-SCHOOL OWNER SELECTION MODE ---
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Multiple Accounts Found</h3>
                  <p className="text-sm text-slate-500 mt-1">Please select which branch you want to manage today.</p>
                </div>
                
                <div className="space-y-3">
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => setSelectedSchoolId(school.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                        selectedSchoolId === school.id 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedSchoolId === school.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{school.name}</p>
                          <p className="text-xs text-slate-500 font-medium">Domain: {school.subdomain}</p>
                        </div>
                      </div>
                      {selectedSchoolId === school.id && (
                        <ShieldCheck className="w-5 h-5 text-blue-600 animate-in zoom-in" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-lg text-center animate-in shake">
                {error}
              </div>
            )}

            <SubmitButton isSelectionMode={isSelectionMode} />

            {isSelectionMode && (
              <button 
                type="button"
                onClick={() => setIsSelectionMode(false)}
                className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700 mt-2"
              >
                ← Back to Login
              </button>
            )}

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
