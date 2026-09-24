import { auth } from "@/auth"
import { LogOut, User } from "lucide-react"
import { signOut } from "@/auth"

export default async function Header() {
  const session = await auth()
  
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Toggle could go here */}
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 hidden md:block">
          Welcome back
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-2 hidden sm:flex">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {session?.user?.email || "User"}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
            {session?.user?.role?.replace("_", " ").toLowerCase() || "Guest"}
          </span>
        </div>
        
        <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
          <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

        <form
          action={async () => {
            "use server"
            await signOut({ redirect: false })
            const { redirect } = await import("next/navigation")
            redirect("/staff-login")
          }}
        >
          <button
            type="submit"
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </form>
      </div>
    </header>
  )
}
