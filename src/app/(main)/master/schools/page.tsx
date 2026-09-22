import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Building2, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function MasterSchoolsPage() {
  const schools = await db.school.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Onboarded Schools</h1>
          <p className="text-slate-400 mt-1">Manage and provision new school instances.</p>
        </div>
        <Link href="/master/schools/new">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add New School
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-xs uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">School Name</th>
                <th scope="col" className="px-6 py-4 font-semibold">Subdomain</th>
                <th scope="col" className="px-6 py-4 font-semibold">Contact</th>
                <th scope="col" className="px-6 py-4 font-semibold">Added On</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-slate-400" />
                    </div>
                    {school.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-green-400">
                    {school.subdomain}
                  </td>
                  <td className="px-6 py-4">
                    {school.contact || "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    {format(new Date(school.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a 
                      href={school.subdomain === "rlacademy" ? "https://schoolerp.vercel.app" : `https://${school.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "schoolsaathi.dpdns.org"}`} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
                        Visit <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  </td>
                </tr>
              ))}
              
              {schools.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No schools found. Add a new school to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
