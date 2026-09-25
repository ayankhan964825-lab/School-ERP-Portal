import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAdminNotices } from "@/app/actions/notices";
import { NoticeManager } from "@/components/dashboard/notices/NoticeManager";

export const metadata = {
  title: "Notice Board - Administration",
};

export default async function AdminNoticesPage({
  params,
}: {
  params: { domain: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/staff-login");
  }

  const schoolId = session.user.schoolId;

  // 1. Fetch all notices for Admin
  const noticesResponse = await getAdminNotices(schoolId);
  if (noticesResponse.error) {
    // If the user lacks permission, we can show an error or redirect.
    // For now, let's render an error state
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">{noticesResponse.error}</p>
      </div>
    );
  }

  const notices = noticesResponse.data || [];

  // 2. Fetch System Roles for the Custom Targeting Dropdown
  const systemRoles = await db.systemRole.findMany({
    where: { schoolId },
    select: { id: true, name: true },
  });

  // 3. Fetch Active Classes for targeting
  // Note: We need to find the currently active session first to filter classes properly.
  const activeSession = await db.academicSession.findFirst({
    where: { schoolId, isActive: true },
    select: { id: true }
  });

  let classes: any[] = [];
  if (activeSession) {
    classes = await db.class.findMany({
      where: { schoolId, sessionId: activeSession.id },
      select: { id: true, name: true, section: true },
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    });
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <NoticeManager 
        schoolId={schoolId} 
        notices={notices}
        systemRoles={systemRoles}
        classes={classes}
      />
    </div>
  );
}
