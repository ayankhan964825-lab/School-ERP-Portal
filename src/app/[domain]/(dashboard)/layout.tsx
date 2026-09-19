import { auth } from "@/auth"
import AppSidebar from "@/components/layout/AppSidebar"
import Header from "@/components/layout/Header"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // NextAuth stores the role as `userType` in the session (see auth.config.ts jwt/session callbacks)
  const role = (session.user as any).userType || "STUDENT"

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      <AppSidebar role={role} />
      
      {/* Main Content Area - padded left by the width of the sidebar (w-64 = 16rem = 256px) */}
      <div className="flex flex-1 flex-col pl-64 transition-all duration-300 ease-in-out">
        <Header />
        
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
