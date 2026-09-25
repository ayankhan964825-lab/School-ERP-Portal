import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import CalendarManager from "@/components/dashboard/calendar/CalendarManager";
import { endOfMonth, startOfMonth, addDays, subDays, subMonths, addMonths } from "date-fns";

export const metadata = {
  title: "Academic Calendar | ERP Portal",
  description: "Manage school calendar and holidays",
};

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: { domain: string };
  searchParams: { month?: string; year?: string };
}) {
  const session = await auth();
  
  if (!session?.user || session.user.userType !== "SUPER_ADMIN") {
    redirect("/start");
  }

  // Get current or selected month
  const now = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  // For an Agenda view, it's better to fetch a wider range of events (e.g., full academic year)
  // We will fetch 2 months before and 10 months ahead from the current date.
  const startDate = subMonths(now, 2);
  const endDate = addMonths(now, 10);

  const schedules = await db.academicSchedule.findMany({
    where: {
      schoolId: session.user.schoolId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <CalendarManager 
        schoolId={session.user.schoolId} 
        initialSchedules={schedules} 
      />
    </div>
  );
}
