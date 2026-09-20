import { getDashboardStats } from "@/app/actions/dashboard";
import { Users, GraduationCap, Percent, IndianRupee, Bell, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, Principal! Here's what's happening at your school today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-slate-200 dark:border-slate-800">
            <Bell className="w-4 h-4" />
            Broadcast Notice
          </Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
            <CalendarIcon className="w-4 h-4" />
            Generate Timetable
          </Button>
        </div>
      </div>

      {/* Glassmorphic Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toString()}
          icon={GraduationCap}
          trend="Total Active"
          color="bg-blue-500"
          textColor="text-blue-500"
          lightColor="bg-blue-50 dark:bg-blue-500/10"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers.toString()}
          icon={Users}
          trend="All Staff"
          color="bg-emerald-500"
          textColor="text-emerald-500"
          lightColor="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <StatCard
          title="Today's Attendance"
          value={`${stats.attendancePercent}%`}
          icon={Percent}
          trend="Present Students"
          color="bg-purple-500"
          textColor="text-purple-500"
          lightColor="bg-purple-50 dark:bg-purple-500/10"
        />
        <StatCard
          title="Today's Collection"
          value={`₹${stats.todayCollection.toLocaleString()}`}
          icon={IndianRupee}
          trend="Total Fees Paid"
          color="bg-orange-500"
          textColor="text-orange-500"
          lightColor="bg-orange-50 dark:bg-orange-500/10"
        />
      </div>
      
      {/* Additional UI modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
         <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl overflow-hidden">
           <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
             <CardTitle className="text-lg">Recent Activities</CardTitle>
           </CardHeader>
           <CardContent className="p-6">
             <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-3">
                  <Bell className="w-6 h-6 text-slate-400" />
                </div>
                <p>No recent activities to show yet.</p>
             </div>
           </CardContent>
         </Card>
         
         <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl overflow-hidden">
           <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
             <CardTitle className="text-lg">Quick Actions</CardTitle>
           </CardHeader>
           <CardContent className="p-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all flex flex-col items-center gap-2 text-center group">
                 <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-indigo-500 group-hover:scale-110 transition-transform">
                   <Users className="w-5 h-5" />
                 </div>
                 <span className="text-sm font-medium">Add Teacher</span>
               </div>
               <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all flex flex-col items-center gap-2 text-center group">
                 <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-full text-blue-500 group-hover:scale-110 transition-transform">
                   <GraduationCap className="w-5 h-5" />
                 </div>
                 <span className="text-sm font-medium">Enroll Student</span>
               </div>
             </div>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color, textColor, lightColor }: { title: string, value: string, icon: any, trend: string, color: string, textColor: string, lightColor: string }) {
  return (
    <Card className={`relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/60 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full ${color} opacity-10 group-hover:opacity-20 transition-opacity blur-2xl`}></div>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {title}
        </CardTitle>
        <div className={`p-2.5 rounded-xl ${lightColor}`}>
          <Icon className={`w-4 h-4 ${textColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}