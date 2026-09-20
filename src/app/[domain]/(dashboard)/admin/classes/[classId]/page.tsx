import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getClassDetails } from "@/app/actions/classes";
import ClassProfile from "@/components/dashboard/classes/ClassProfile";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Class Profile | ERP",
};

export default async function ClassProfilePage({
  params,
}: {
  params: Promise<{ domain: string; classId: string }>;
}) {
  const { domain, classId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/staff-login");
  }

  const userType = (session.user as any).userType;
  if (userType !== "SUPER_ADMIN" && userType !== "MASTER_ADMIN") {
    redirect("/unauthorized");
  }

  const schoolId = (session.user as any).schoolId;

  // Fetch detailed class data including students and subjects
  const result = await getClassDetails(schoolId, classId);

  if (!result.success || !result.data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Class not found
        </h1>
        <p className="text-slate-500 mt-2">{result.error}</p>
        <Link href={`/admin/classes`} className="mt-4">
          <Button variant="outline">Back to Classes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href={`/admin/classes`}>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Class Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View directory and settings for this class.
          </p>
        </div>
      </div>

      <ClassProfile classData={result.data} />
    </div>
  );
}
