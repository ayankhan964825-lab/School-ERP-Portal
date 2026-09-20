import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTeachers } from "@/app/actions/teachers";
import { seedDummySubjects } from "@/app/actions/subjects";
import TeacherManager from "@/components/dashboard/teachers/TeacherManager";

export const metadata = {
  title: "Teacher Management | ERP",
};

export default async function TeachersPage({ params }: { params: Promise<{ domain: string }> }) {
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

  // Auto-seed dummy subjects for testing (runs once)
  await seedDummySubjects(schoolId);

  // Fetch teachers
  const res = await getTeachers(schoolId);
  const teachers = res.success ? res.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Teacher Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Add, edit, and assign teachers to their respective classes and subjects.
        </p>
      </div>

      <TeacherManager schoolId={schoolId} initialTeachers={teachers} />
    </div>
  );
}
