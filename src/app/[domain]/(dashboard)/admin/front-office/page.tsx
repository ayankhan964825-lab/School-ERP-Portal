import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getVisitors, getCallLogs, getComplaints } from "@/app/actions/frontOffice";
import FrontOfficeManager from "@/components/dashboard/front-office/FrontOfficeManager";

export const metadata = {
  title: "Front Office CRM - Admin",
};

export default async function FrontOfficePage() {
  const session = await auth();
  if (!session?.user) redirect("/staff-login");

  const schoolId = (session.user as any).schoolId;
  if (!schoolId) redirect("/staff-login");

  // Fetch all 3 data streams concurrently for speed
  const [visitorsRes, callsRes, complaintsRes] = await Promise.all([
    getVisitors(schoolId),
    getCallLogs(schoolId),
    getComplaints(schoolId),
  ]);

  return (
    <div className="w-full">
      <FrontOfficeManager 
        schoolId={schoolId}
        visitors={visitorsRes.data || []}
        calls={callsRes.data || []}
        complaints={complaintsRes.data || []}
      />
    </div>
  );
}
