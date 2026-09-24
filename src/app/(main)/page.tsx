import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Sparkles, GraduationCap, Building2 } from "lucide-react";
import { db } from "@/lib/db";

export default async function MainGatewayPage() {
  const session = await auth();
  
  // Handle redirects for logged in users
  if ((session?.user as any)?.userType === "MASTER_ADMIN") {
    redirect("/master");
  } else if (session?.user) {
    const userSchool = await db.school.findUnique({
      where: { id: (session.user as any).schoolId },
      select: { subdomain: true }
    });
    if (userSchool) {
      if (isDev) {
        redirect(`http://${userSchool.subdomain}.localhost:3000/admin`);
      } else {
        // Vercel Live Testing Fallback (As requested by user: admin panel runs on Vercel domain)
        redirect(`https://schoolerpportal.vercel.app/admin`);
      }
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* ===== HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">SchoolSaathi</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/hq" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hidden sm:block">
              Partner HQ
            </Link>
            <Link href="/start">
              <button className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Static Background Gradients (No Framer Motion required) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] opacity-40 dark:opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-6 ring-1 ring-inset ring-blue-500/20">
              <Sparkles className="w-4 h-4" />
              Next-Gen School Management
            </span>
          </div>

          <h1 className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl mx-auto leading-[1.1]">
            Run your entire school from a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">single platform.</span>
          </h1>

          <p className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Instantly provision your own custom ERP dashboard. Manage admissions, fees, attendance, and academics in one place with zero setup time.
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/start">
              <button className="h-14 px-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all">
                Create Your School <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <div className="text-sm text-slate-500 font-medium px-4 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              No credit card required
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES / PORTALS SECTION ===== */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">Built for Everyone</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Dedicated portals and custom subdomains for a seamless experience across all stakeholders.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Card 1 */}
            <div className="group bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Custom Subdomains</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                Every school gets its own isolated workspace (e.g., rlacademy.schoolsaathi.dpdns.org) with secure multi-tenant architecture.
              </p>
              <div className="flex items-center text-sm font-semibold text-blue-600">
                Instantly provisioned <CheckCircle2 className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="group bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                Built on Next.js 15 and React 19. Experience zero-delay navigation, optimistic UI updates, and an offline-first architecture.
              </p>
              <div className="flex items-center text-sm font-semibold text-purple-600">
                High Performance <Zap className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="group bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Enterprise Security</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                Bank-grade encryption, strict tenant data isolation, and granular role-based access control (RBAC) to keep student data safe.
              </p>
              <div className="flex items-center text-sm font-semibold text-emerald-600">
                100% Secured <ShieldCheck className="w-4 h-4 ml-1" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-slate-500">
            <GraduationCap className="w-5 h-5" />
            <span className="font-semibold">SchoolSaathi</span>
            <span className="text-sm">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500 font-medium">
            <Link href="/hq" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Developer HQ
            </Link>
            <Link href="/start" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Register School
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
