import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserType } from "@prisma/client";
import { ShieldCheck, Server, ArrowRight } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function MainGatewayPage() {
  const session = await auth();
  
  // If Master Admin is logged in, redirect them to the HQ dashboard
  if ((session?.user as any)?.userType === "MASTER_ADMIN") {
    redirect("/master");
  } else if (session?.user) {
    // If a school user logs in on the main domain, redirect them to their school's subdomain
    const userSchool = await db.school.findUnique({
      where: { id: (session.user as any).schoolId },
      select: { subdomain: true }
    });
    if (userSchool) {
      redirect(`http://${userSchool.subdomain}.localhost:3000/admin`);
    }
  }

  // Public Landing Page for ERPVyapar
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-full mb-4">
          <Server className="w-12 h-12 text-blue-600" />
        </div>
        
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          Welcome to ERPVyapar
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The ultimate multi-tenant SaaS platform for managing educational institutions at scale. 
          Your school. Your subdomain. Infinite possibilities.
        </p>

        <div className="pt-8 flex gap-4 justify-center">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-sm flex-1 text-left">
            <h3 className="font-bold text-slate-800 mb-2">For Developers</h3>
            <p className="text-sm text-slate-500 mb-4">Manage infrastructure and billing.</p>
            <Link 
              href="/hq" 
              className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Access HQ <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-sm flex-1 text-left">
            <h3 className="font-bold text-slate-800 mb-2">For Schools</h3>
            <p className="text-sm text-slate-500 mb-4">Login through your school's custom subdomain (e.g. gmacademy.erpvyapar.com).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
