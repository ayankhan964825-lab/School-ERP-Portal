import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ClassManager from "@/components/dashboard/classes/ClassManager";

export const metadata = {
  title: "Class Management | ERP",
};

export default async function ClassesPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/staff-login");
  }

  // Double check authorization: only SUPER_ADMIN or MASTER_ADMIN
  const userType = (session.user as any).userType;
  if (userType !== "SUPER_ADMIN" && userType !== "MASTER_ADMIN") {
    redirect("/unauthorized"); // Or back to dashboard
  }

  const schoolId = (session.user as any).schoolId;

  // Fetch initial classes data
  const classesData = await db.class.findMany({
    where: { schoolId },
    include: {
      _count: {
        select: { students: true, subjects: true },
      },
    },
    orderBy: [
      { name: "asc" },
      { section: "asc" },
    ],
  });

  // Transform data slightly to match expected UI props
  const formattedClasses = classesData.map((c) => ({
    id: c.id,
    name: c.name,
    section: c.section,
    academicYear: c.academicYear,
    studentCount: c._count.students,
    subjectCount: c._count.subjects,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Class Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage academic classes, sections, and view enrollment statistics.
        </p>
      </div>

      <ClassManager schoolId={schoolId} initialClasses={formattedClasses} />
    </div>
  );
}
