"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { StudentStatus } from "@prisma/client";

// ─────────────────────────────────────────────
// 1. Get Enrolled Students for a Session
// ─────────────────────────────────────────────
export async function getStudents(
  schoolId: string,
  sessionId: string,
  filters?: { classId?: string; status?: StudentStatus }
) {
  try {
    const where: any = {
      session: { schoolId },
      sessionId,
    };

    if (filters?.classId) where.classId = filters.classId;
    if (filters?.status) where.status = filters.status;

    const enrollments = await db.studentEnrollment.findMany({
      where,
      include: {
        class: true,
        student: {
          include: {
            user: true,
            parent: {
              include: { user: true }
            }
          }
        }
      },
      orderBy: [
        { class: { name: "asc" } },
        { class: { section: "asc" } },
        { rollNumber: "asc" }
      ]
    });

    return { success: true, data: enrollments };
  } catch (error: any) {
    console.error("Error fetching students:", error);
    return { error: error.message || "Failed to fetch students." };
  }
}

// ─────────────────────────────────────────────
// 2. Update Enrollment Status
// ─────────────────────────────────────────────
export async function updateStudentStatus(
  enrollmentId: string,
  status: StudentStatus,
  reason?: string
) {
  try {
    const updated = await db.studentEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status,
        statusReason: reason || null,
      }
    });

    revalidatePath("/[domain]/(dashboard)/admin/students", "page");
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || "Failed to update status." };
  }
}

// ─────────────────────────────────────────────
// 3. Update Core Student Details
// ─────────────────────────────────────────────
export async function updateStudentDetails(
  studentId: string,
  userId: string,
  data: {
    name?: string;
    phone?: string;
    pickupPointId?: string;
  }
) {
  try {
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          phone: data.phone || null,
        }
      }),
      db.studentProfile.update({
        where: { id: studentId },
        data: {
          pickupPointId: data.pickupPointId || null,
        }
      })
    ]);

    revalidatePath("/[domain]/(dashboard)/admin/students", "page");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update student details." };
  }
}
