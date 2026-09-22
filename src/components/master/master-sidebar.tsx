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
    <div className="flex h-full w-64 flex-col bg-slate-950 border-r border-slate-900">
      <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-slate-900 bg-black">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
          <Code2 className="h-5 w-5 text-green-500" />
        </div>
        <span className="font-bold text-white tracking-tight">HQ Panel</span>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/master" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-200",
                    isActive ? "text-green-400" : "text-slate-500 group-hover:text-slate-300"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-900 bg-black/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <span className="text-xs font-bold text-slate-300">HQ</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Master Admin</span>
            <span className="text-xs text-slate-500">System Owner</span>
          </div>
        </div>
      </div>
    </div>
  );
}
