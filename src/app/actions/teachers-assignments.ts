"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function assignTeacherToClass(teacherId: string, classId: string, subjectId: string, isClassTeacher: boolean, assignedById: string) {
  try {
    const newAssignment = await db.classTeacher.create({
      data: {
        staffId: teacherId,
        classId,
        subjectId,
        isClassTeacher,
        assignedBy: assignedById,
      }
    });
    
    revalidatePath("/[domain]/(dashboard)/admin/teachers", "page");
    return { success: true, data: newAssignment };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: "This teacher is already assigned to this class and subject." };
    }
    return { error: error.message || "Failed to assign teacher." };
  }
}

export async function getTeacherAssignments(teacherId: string) {
  try {
    const assignments = await db.classTeacher.findMany({
      where: { staffId: teacherId },
      include: {
        class: true,
        subject: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: assignments };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch assignments." };
  }
}

export async function removeTeacherAssignment(assignmentId: string) {
  try {
    await db.classTeacher.delete({
      where: { id: assignmentId }
    });
    revalidatePath("/[domain]/(dashboard)/admin/teachers", "page");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to remove assignment." };
  }
}
