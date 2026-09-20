import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdmissionEnquiries } from "@/app/actions/admissions";
import { getClasses } from "@/app/actions/classes";
import AdmissionManager from "@/components/dashboard/admissions/AdmissionManager";

export const metadata = {
  title: "Admissions | ERP",
};

export default async function AdmissionsPage({ params }: { params: Promise<{ domain: string }> }) {
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

  // Fetch all enquiries and classes in parallel
  const [enquiriesRes, classesRes] = await Promise.all([
    getAdmissionEnquiries(schoolId),
    getClasses(schoolId),
  ]);

  const enquiries = enquiriesRes.success ? enquiriesRes.data : [];
  const classes = classesRes.success ? classesRes.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Admissions
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Review applications, manage interviews, and approve admissions.
        </p>
      </div>

      <AdmissionManager
        schoolId={schoolId}
        initialEnquiries={enquiries}
        classes={classes}
      />
    </div>
  );
}
