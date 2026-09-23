import React from "react";
import { Lock } from "lucide-react";
import { auth } from "@/auth";

interface ModuleGateProps {
  moduleName: string; // The key in School.modulesEnabled JSON
  children: React.ReactNode;
  fallback?: React.ReactNode; // What to show if locked
}

export default async function ModuleGate({ moduleName, children, fallback }: ModuleGateProps) {
  const session = await auth();
  
  if (!session?.user) return null;

  const modulesEnabled = (session.user as any).modulesEnabled as Record<string, boolean> | null;

  // By default, if modulesEnabled is not set, we assume modules are NOT enabled (except core ones)
  // Or we could check if it explicitly equals true.
  const isEnabled = modulesEnabled ? modulesEnabled[moduleName] === true : false;

  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative group cursor-not-allowed">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[1px] rounded-md transition-opacity">
        <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          <Lock className="w-3 h-3" />
          Module Locked
        </div>
      </div>
    </div>
  );
}
