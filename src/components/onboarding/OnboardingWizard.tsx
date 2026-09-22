"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Mail,
  Building2,
  Globe,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  Crown,
  Rocket,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { checkSubdomainAvailability, provisionNewSchool } from "@/app/actions/onboarding";

const PLANS = [
  {
    id: "FREE",
    name: "Free Tier",
    tagline: "Perfect for exploring.",
    price: "₹0",
    priceLabel: "Monthly Fees",
    icon: Sparkles,
    features: [
      { text: "Up to 50 Students", positive: true },
      { text: "Basic Class Management", positive: true },
      { text: "Community Support", positive: false },
    ],
    popular: false,
  },
  {
    id: "GROWTH",
    name: "Growth Plan",
    tagline: "₹1,000/month",
    price: "₹1,000",
    priceLabel: "/month",
    icon: Rocket,
    features: [
      { text: "Unlimited Students", positive: true },
      { text: "Custom Subdomain", positive: true },
      { text: "Priority Support", positive: true },
    ],
    popular: true,
  },
  {
    id: "PREMIUM",
    name: "Premium Plan",
    tagline: "₹2,500/month",
    price: "₹2,500",
    priceLabel: "/month",
    icon: Crown,
    features: [
      { text: "Everything in Growth", positive: true },
      { text: "Custom Domain (.com)", positive: true },
      { text: "AI Timetable & Reports", positive: true },
    ],
    popular: false,
  },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Form data
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("FREE");

  // Subdomain availability
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [subdomainError, setSubdomainError] = useState("");

  // General error
  const [error, setError] = useState("");

  // Auto-generate subdomain from school name
  useEffect(() => {
    const slug = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
    setSubdomain(slug);
    setSubdomainStatus("idle");
  }, [schoolName]);

  // Debounced subdomain check
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setSubdomainStatus("checking");
      const result = await checkSubdomainAvailability(subdomain);
      if (result.available) {
        setSubdomainStatus("available");
        setSubdomainError("");
      } else {
        setSubdomainStatus("taken");
        setSubdomainError(result.error || "Not available");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomain]);

  // Step validators
  const canGoToStep2 = email.includes("@") && email.includes(".");
  const canGoToStep3 = schoolName.length >= 2 && subdomain.length >= 3 && subdomainStatus === "available";
  const canGoToStep4 = password.length >= 8 && password === confirmPassword;

  function handleNext() {
    setError("");
    if (step === 1 && canGoToStep2) setStep(2);
    else if (step === 2 && canGoToStep3) setStep(3);
    else if (step === 3 && canGoToStep4) setStep(4);
  }

  function handleBack() {
    setError("");
    if (step > 1) setStep(step - 1);
  }

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      const result = await provisionNewSchool({
        email,
        password,
        schoolName,
        subdomain,
        plan: selectedPlan,
      });

      if (!result.success) {
        setError(result.error || "Something went wrong.");
        return;
      }

      // Redirect to the new school's login page
      const isLocal = window.location.hostname === "localhost";
      const domainSuffix = isLocal ? "localhost:3000" : "schoolsaathi.dpdns.org";
      const protocol = isLocal ? "http" : "https";
      window.location.href = `${protocol}://${result.subdomain}.${domainSuffix}/staff-login`;
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">SchoolSaathi</span>
          </div>
          <span className="text-sm font-medium text-slate-500">
            Step {step} of 4
          </span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Step Content */}
          <div className="p-8">
            {/* ===== STEP 1: Email ===== */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Let&apos;s get started
                  </h2>
                  <p className="text-slate-500 mt-1">Tell us a bit about your school</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="owner@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      className="pl-11 h-12 text-base rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    This will be your admin login email.
                  </p>
                </div>
              </div>
            )}

            {/* ===== STEP 2: School Name & Subdomain ===== */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Choose your URL
                  </h2>
                  <p className="text-slate-500 mt-1">Your school will get its own unique address</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      School Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        placeholder="e.g. RL Academy"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="pl-11 h-12 text-base rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      School URL
                    </label>
                    <div className="flex items-center gap-0">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          placeholder="my-school"
                          value={subdomain}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                            setSubdomain(val);
                          }}
                          className="pl-11 h-12 text-base rounded-xl rounded-r-none border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                      </div>
                      <div className="h-12 px-4 flex items-center bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700 rounded-xl rounded-l-none text-sm font-medium text-slate-500 whitespace-nowrap">
                        .schoolsaathi.dpdns.org
                      </div>
                    </div>
                    {/* Availability indicator */}
                    <div className="flex items-center gap-1.5 min-h-[20px]">
                      {subdomainStatus === "checking" && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                        </span>
                      )}
                      {subdomainStatus === "available" && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {subdomain}.schoolsaathi.dpdns.org is available!
                        </span>
                      )}
                      {subdomainStatus === "taken" && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> {subdomainError}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      You can add a custom &apos;.com&apos; domain later.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 3: Password ===== */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Secure your ERP
                  </h2>
                  <p className="text-slate-500 mt-1">Set up a password for your new school</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Min 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 h-12 text-base rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                        className="pl-11 h-12 text-base rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Passwords do not match
                      </p>
                    )}
                    {confirmPassword && password === confirmPassword && password.length >= 8 && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 4: Plan Selection ===== */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Choose your Plan
                  </h2>
                  <p className="text-slate-500 mt-1">Select the plan that fits your school</p>
                </div>

                <div className="space-y-3">
                  {PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 relative ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 ring-1 ring-blue-500/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50"
                        }`}
                      >
                        {plan.popular && (
                          <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-full tracking-wider">
                            Popular
                          </span>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                              <p className="text-xs text-slate-500">{plan.tagline}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-600"
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                          {plan.features.map((f, i) => (
                            <span key={i} className="text-xs text-slate-500 flex items-center gap-1">
                              {f.positive ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Zap className="w-3 h-3 text-amber-500" />
                              )}
                              {f.text}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl text-center">
                {error}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-8 pb-8 flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-12 rounded-xl px-6 border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && !canGoToStep2) ||
                  (step === 2 && !canGoToStep3) ||
                  (step === 3 && !canGoToStep4)
                }
                className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white font-semibold shadow-lg transition-all"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-200 dark:shadow-none transition-all"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating your school...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Create School Now
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Terms */}
          {step === 1 && (
            <div className="px-8 pb-6 text-center">
              <p className="text-xs text-slate-400">
                By continuing, you agree to our Terms &amp; Conditions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
