import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Building2, Users, CreditCard, Activity } from "lucide-react";
import { db } from "@/lib/db";

export default async function MasterDashboard() {
  // Fetch some aggregate stats
  const totalSchools = await db.school.count();
  const totalUsers = await db.user.count({
    where: {
      userType: {
        in: ["STUDENT", "TEACHER", "PARENT", "STAFF"]
      }
    }
  });

  const stats = [
    { name: "Total Schools", value: totalSchools.toString(), icon: Building2, trend: "+2 this month" },
    { name: "Active Users", value: totalUsers.toString(), icon: Users, trend: "+12% vs last month" },
    { name: "Monthly Revenue", value: "₹45,000", icon: CreditCard, trend: "Stable" },
    { name: "System Health", value: "100%", icon: Activity, trend: "All services operational" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">HQ Overview</h1>
          <p className="text-slate-400 mt-1">Monitor all school deployments from one place.</p>
        </div>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/hq" });
        }}>
          <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white">
            Secure Logout
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-slate-800 p-3">
                <stat.icon className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">{stat.name}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              <span className="text-green-400 mr-2">↑</span>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}