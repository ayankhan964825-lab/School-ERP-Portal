"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.schoolId) {
    throw new Error("Unauthorized");
  }

  const schoolId = session.user.schoolId;

  // 1. Total Students
  const totalStudents = await db.studentProfile.count({
    where: {
      user: {
        schoolId: schoolId,
      },
    },
  });

  // 2. Total Teachers
  const totalTeachers = await db.teacherProfile.count({
    where: {
      user: {
        schoolId: schoolId,
      },
    },
  });

  // 3. Today's Collection
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paymentsToday = await db.feePayment.aggregate({
    where: {
      student: {
        user: {
          schoolId: schoolId,
        },
      },
      paymentDate: {
        gte: today,
      },
      status: "PAID",
    },
    _sum: {
      amountPaid: true,
    },
  });

  const todayCollection = paymentsToday._sum.amountPaid || 0;

  // 4. Today's Attendance %
  // Simplified for now: Get total present / total students
  const attendanceToday = await db.attendance.count({
    where: {
      class: {
        schoolId: schoolId,
      },
      date: today,
      status: "PRESENT",
    },
  });

  const attendancePercent =
    totalStudents > 0
      ? Math.round((attendanceToday / totalStudents) * 100)
      : 0;

  return {
    totalStudents,
    totalTeachers,
    todayCollection,
    attendancePercent,
  };
}
