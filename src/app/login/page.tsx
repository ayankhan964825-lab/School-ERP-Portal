"use client"

import { useActionState, useState, useEffect } from "react"
import { authenticate } from "@/app/actions/auth"
import Link from "next/link"
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle2,
  BookOpen,
  Users,
} from "lucide-react"

// Mock components to match shadcn/ui contract with Tailwind CSS v4 styling
function Button({
  className = "",
  variant = "default",
  size = "default",
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50"

  const variants = {
    default:
      "bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.98]",
    outline:
      "border border-slate-200/80 bg-white/70 hover:bg-slate-50 text-slate-800 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
    ghost: "hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-white/10",
    link: "text-indigo-600 hover:text-indigo-500 underline-offset-4 hover:underline p-0 h-auto"
  }

  const sizes = {
    default: "h-11 px-5 py-2.5",
    sm: "h-9 rounded-lg px-3 text-xs",
    lg: "h-13 rounded-xl px-8 text-base",
    icon: "h-10 w-10"
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

function Input({
  className = "",
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={`flex h-11 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20 ${className}`}
      {...props}
    />
  )
}

function Label({
  className = "",
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </label>
  )
}

function Card({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-indigo-950/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  )

  const [showPassword, setShowPassword] = useState(false)
  const [activeRole, setActiveRole] = useState<"staff" | "student" | "parent">("staff")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Noise & Ambient Glow Orbs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-indigo-600/25 blur-[140px]" />
        <div className="absolute top-[40%] -right-[15%] h-[700px] w-[700px] rounded-full bg-violet-600/20 blur-[160px]" />
        <div className="absolute -bottom-[20%] left-[25%] h-[550px] w-[550px] rounded-full bg-blue-600/15 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Premium Educational SaaS Showcase & Ambient Visuals           */}
        {/* ========================================================================= */}
        <aside className="relative hidden w-full flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-slate-950/90 p-12 lg:flex lg:w-[52%] xl:w-[55%] 2xl:p-16">
          {/* Subtle Grid overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem]" />

          {/* Top Brand Area */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="group flex items-center gap-3.5">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-105">
                <GraduationCap className="h-6 w-6 text-white transition-transform group-hover:-rotate-6" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-400" />
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-white">AuraERP</span>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
                    ACADEMIC OS
                  </span>
                </div>
                <span className="text-xs text-slate-400">Next-Generation School Operations</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-slate-300">Fall Semester 2025 Live</span>
            </div>
          </div>

          {/* Middle SaaS Showcase: Hero Visual & Glassmorphism Dashboard Cards */}
          <div className="relative z-10 my-auto py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 backdrop-blur-md mb-6">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Unified Campus Intelligence Platform</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl xl:text-6xl/tight">
              Empowering institutions <br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                with modern precision.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base text-slate-300/90 leading-relaxed">
              Seamlessly coordinate admissions, attendance, dynamic gradebooks, and financial operations with real-time institutional analytics.
            </p>

            {/* Interactive Preview Cards Mockup */}
            <div className="mt-10 relative grid grid-cols-2 gap-4 max-w-lg">
              {/* Floating Metric 1 */}
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-indigo-500/40 hover:bg-white/[0.07]">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-indigo-500/20 p-2.5 text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    +14.2% <ArrowRight className="h-3 w-3 -rotate-45" />
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-white tracking-tight">4,820</div>
                  <div className="text-xs text-slate-400 font-medium">Active Enrolled Scholars</div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>99.4% daily verified attendance</span>
                </div>
              </div>

              {/* Floating Metric 2 */}
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-violet-500/40 hover:bg-white/[0.07]">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-violet-500/20 p-2.5 text-violet-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-md">
                    Automated
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-white tracking-tight">98.8%</div>
                  <div className="text-xs text-slate-400 font-medium">Syllabus Completion Index</div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                  <span>State board standard compliant</span>
                </div>
              </div>

              {/* Decorative Glow underneath cards */}
              <div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 h-16 w-3/4 rounded-full bg-indigo-500/20 blur-xl" />
            </div>

            {/* Testimonial Snippet */}
            <div className="mt-10 max-w-lg rounded-2xl border border-white/10 bg-slate-900/60 p-4.5 backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-500 p-[2px]">
                  <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white">
                    DR
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Dr. Elizabeth Vance</p>
                  <p className="text-[11px] text-slate-400">Dean of Academic Affairs, St. Jude Prep</p>
                </div>
              </div>
              <p className="mt-2.5 text-xs text-slate-300 italic">
                &ldquo;AuraERP cut our cross-department administrative latency by 85%. It feels like an operating system built for the next century.&rdquo;
              </p>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              <span>FERPA & GDPR Compliant Institutional Security</span>
            </div>
            <span>v4.18.2-enterprise</span>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Ultra-Clean, High-Aesthetic Form Section                    */}
        {/* ========================================================================= */}
        <main className="relative flex w-full flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16">
          {/* Top Mobile Bar / Help Link */}
          <div className="flex items-center justify-between w-full max-w-md mx-auto">
            {/* Visible on Mobile */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">AuraERP</span>
            </div>

            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              <span>Need help?</span>
              <a
                href="#contact-it"
                className="font-medium text-indigo-400 transition-colors hover:text-indigo-300 underline underline-offset-2"
              >
                IT Helpdesk
              </a>
            </div>
          </div>

          {/* Centered Login Card */}
          <div className="my-auto mx-auto w-full max-w-md py-8">
            <Card className="relative overflow-hidden border border-white/10 bg-slate-900/70 p-7 sm:p-9 shadow-2xl backdrop-blur-2xl">
              {/* Subtle top iridescent highlight */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80" />

              <div className="mb-7 text-left">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Sign in to Portal
                  </h2>
                  <div className="flex h-7 items-center rounded-full bg-indigo-500/10 px-2.5 text-[11px] font-semibold text-indigo-400 ring-1 ring-indigo-500/20">
                    SSO Active
                  </div>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
                  Welcome back. Select your portal designation to proceed.
                </p>
              </div>

              {/* Role Selector Tabs (Staff / Student / Parent) */}
              <div className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-slate-800/80 p-1 ring-1 ring-white/10">
                {(
                  [
                    { id: "staff", label: "Faculty", icon: Building2 },
                    { id: "student", label: "Scholar", icon: GraduationCap },
                    { id: "parent", label: "Guardian", icon: Users },
                  ] as const
                ).map((role) => {
                  const Icon = role.icon
                  const isActive = activeRole === role.id
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setActiveRole(role.id)}
                      className={`relative flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${isActive
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{role.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Error Message Toast / Banner (React 19 Server Action status) */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-rose-200 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                  <div className="text-xs sm:text-sm leading-snug">
                    <span className="font-semibold block text-rose-300">Authentication Failed</span>
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* Form with required Action Hook integration */}
              <form action={formAction} className="space-y-5">
                {/* Email Address */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email">Institutional ID / Email</Label>
                    <span className="text-[11px] text-slate-500">e.g. j.doe@campus.edu</span>
                  </div>
                  <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 transition-colors group-focus-within:text-indigo-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="teacher@academy.edu"
                      className="pl-10 text-white placeholder:text-slate-500"
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 transition-colors group-focus-within:text-indigo-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      className="pl-10 pr-10 text-white placeholder:text-slate-500"
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 transition-colors hover:text-slate-300 focus:outline-none"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Device & Security Policy */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="remember"
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800/80 text-indigo-600 accent-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-0 transition"
                      disabled={isPending}
                    />
                    <span className="text-slate-400 font-medium hover:text-slate-300">
                      Remember this workstation
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500">30-day session</span>
                </div>

                {/* Submit Button with Shimmer & Pending States */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="relative w-full overflow-hidden text-sm font-semibold tracking-wide shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:shadow-indigo-500/50 hover:brightness-105 active:scale-[0.99]"
                  >
                    {/* Shimmer light sweep animation */}
                    <span className="pointer-events-none absolute -inset-full top-0 block -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-1000 group-hover:inset-full" />

                    {isPending ? (
                      <span className="flex items-center gap-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Verifying Credentials...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>Sign In to Dashboard</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>

              {/* Single Sign-On / Campus Directory Divider */}
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-3 font-semibold tracking-wider text-slate-500">
                    Or sign in with
                  </span>
                </div>
              </div>

              {/* External SSO Providers */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isPending}
                  className="w-full text-xs font-medium border-white/10 bg-slate-800/40 text-slate-200 hover:bg-slate-800/80 hover:text-white"
                >
                  <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google Workspace
                </Button>

                <Button
                  variant="outline"
                  type="button"
                  disabled={isPending}
                  className="w-full text-xs font-medium border-white/10 bg-slate-800/40 text-slate-200 hover:bg-slate-800/80 hover:text-white"
                >
                  <svg className="h-4 w-4 mr-1.5" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  Microsoft 365
                </Button>
              </div>

              {/* Security Badge Footnote */}
              <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Encrypted 256-bit SSL connection</span>
                <span>•</span>
                <Link href="/privacy" className="hover:text-slate-400 transition-colors">
                  Privacy
                </Link>
                <span>•</span>
                <Link href="/terms" className="hover:text-slate-400 transition-colors">
                  Terms
                </Link>
              </div>
            </Card>

            {/* Quick Demo Access Bar */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                New faculty or student?{" "}
                <Link href="/activation" className="font-medium text-indigo-400 hover:text-indigo-300">
                  Activate your campus credentials →
                </Link>
              </p>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="mx-auto flex w-full max-w-md items-center justify-between text-[11px] text-slate-600">
            <span>© 2025 Aura Systems, Inc.</span>
            <span>All rights reserved.</span>
          </div>
        </main>
      </div>
    </div>
  )
}
