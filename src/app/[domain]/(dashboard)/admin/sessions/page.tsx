import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import SessionsManager from "@/components/dashboard/sessions/SessionsManager";

export const metadata = {
  title: "Academic Sessions | ERP",
};

export default async function SessionsPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/staff-login");
  }

  const userType = (session.user as any).userType;
  if (userType !== "SUPER_ADMIN" && userType !== "MASTER_ADMIN") {
    redirect("/unauthorized");
  }

  const schoolId = (session.user as any).schoolId;

  const sessions = await db.academicSession.findMany({
    where: { schoolId },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Academic Sessions
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage academic years and terms for your school.
        </p>
      </div>

      <SessionsManager schoolId={schoolId} initialSessions={sessions} />
    </div>
  );
}
