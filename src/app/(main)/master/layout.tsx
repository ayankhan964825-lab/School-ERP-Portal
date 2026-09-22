import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MasterSidebar } from "@/components/master/master-sidebar";
import { UserType } from "@prisma/client";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Protect the Master routes
  if (!session?.user) {
    redirect("/hq");
  }

  if ((session.user as any).userType !== UserType.MASTER_ADMIN) {
    // If not a master admin, boot them out
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-black">
      <MasterSidebar />
      <main className="flex-1 overflow-y-auto bg-black p-8">
        {children}
      </main>
    </div>
  );
}
