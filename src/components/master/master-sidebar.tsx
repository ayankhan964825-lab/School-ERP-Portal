"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Settings, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/master", icon: LayoutDashboard },
  { name: "Schools", href: "/master/schools", icon: Building2 },
  { name: "System Settings", href: "/master/settings", icon: Settings },
];

export function MasterSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white truncate">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-school-primary text-white overflow-hidden">
             <Code2 className="h-5 w-5" />
          </div>
          <span className="text-lg tracking-tight truncate">HQ Panel</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </div>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/master" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-school-primary-50 text-school-primary-700 dark:bg-school-primary-950 dark:text-school-primary-300"
                    : "text-slate-700 hover:bg-school-primary-50 hover:text-school-primary-700 dark:text-slate-300 dark:hover:bg-school-primary-950 dark:hover:text-school-primary-300"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-school-primary-600 dark:text-school-primary-400" : "text-slate-400 group-hover:text-school-primary-500 dark:text-slate-500"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
          <div className="h-8 w-8 rounded-full bg-school-primary/10 flex items-center justify-center border border-school-primary/20">
            <span className="text-xs font-bold text-school-primary-700 dark:text-school-primary-300">HQ</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Master Admin</span>
            <span className="text-[11px] text-slate-500">System Owner</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
