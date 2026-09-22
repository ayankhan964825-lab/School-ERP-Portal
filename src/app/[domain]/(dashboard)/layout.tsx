import { auth } from "@/auth"
import AppSidebar from "@/components/layout/AppSidebar"
import Header from "@/components/layout/Header"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/staff-login")
  }

  // NextAuth stores the role as `userType` in the session (see auth.config.ts jwt/session callbacks)
  const role = (session.user as any).userType || "STUDENT"
  const schoolId = (session.user as any).schoolId

  let schoolData = null
  if (schoolId) {
    schoolData = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true, logo: true }
    })
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      <AppSidebar 
        role={role} 
        schoolName={schoolData?.name} 
        schoolLogo={schoolData?.logo} 
      />
      
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
