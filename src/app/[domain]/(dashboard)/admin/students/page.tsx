import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getStudents } from "@/app/actions/students";
import { getSessions } from "@/app/actions/sessions";
import { getClasses } from "@/app/actions/classes";
import StudentManager from "@/components/dashboard/students/StudentManager";

export const metadata = {
  title: "Student Directory | ERP",
};

export default async function StudentsPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/staff-login");
  }

  const userType = (session.user as any).userType;
  if (userType !== "SUPER_ADMIN" && userType !== "MASTER_ADMIN" && userType !== "STAFF") {
    redirect("/unauthorized");
  }

  const schoolId = (session.user as any).schoolId;

  // 1. Fetch Sessions & Find Active One
  const sessionsRes = await getSessions(schoolId);
  const sessions = sessionsRes.success ? sessionsRes.data : [];
  const activeSession = sessions.find((s: any) => s.isActive);
  const activeSessionId = activeSession?.id || (sessions.length > 0 ? sessions[0].id : null);

  // 2. Fetch Initial Students for the active session and all classes
  let initialStudents: any[] = [];
  let classes: any[] = [];

  if (activeSessionId) {
    const [studentsRes, classesRes] = await Promise.all([
      getStudents(schoolId, activeSessionId),
      getClasses(schoolId) // Ideally filter classes by session, but our getClasses fetches all for now
    ]);
    
    if (studentsRes.success) initialStudents = studentsRes.data;
    if (classesRes.success) classes = classesRes.data.filter((c: any) => c.sessionId === activeSessionId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Student Directory
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          View and manage all students across all academic sessions.
        </p>
      </div>

      <StudentManager
        schoolId={schoolId}
        sessions={sessions}
        activeSessionId={activeSessionId}
        classes={classes}
        initialStudents={initialStudents}
      />
    </div>
  );
}
