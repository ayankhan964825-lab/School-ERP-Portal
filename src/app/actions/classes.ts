"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getClasses(schoolId: string) {
  try {
    const classes = await db.class.findMany({
      where: { schoolId },
      include: {
        session: true,
        _count: {
          select: { studentEnrollments: true, subjects: true },
        },
      },
      orderBy: [
        { name: "asc" },
        { section: "asc" },
      ],
    });
    return { success: true, data: classes };
  } catch (error) {
    console.error("Error fetching classes:", error);
    return { error: "Failed to fetch classes." };
  }
}

export async function createClass(schoolId: string, data: { name: string; section: string; sessionId: string }) {
  try {
    const newClass = await db.class.create({
      data: {
        schoolId,
        name: data.name,
        section: data.section,
        sessionId: data.sessionId,
      },
    });

    revalidatePath("/[domain]/(dashboard)/admin/classes", "page");
    return { success: true, data: newClass };
  } catch (error: any) {
    console.error("Error creating class:", error);
    if (error.code === "P2002") {
      return { error: `Class ${data.name} - ${data.section} already exists for this academic session.` };
    }
    return { error: "Failed to create class." };
  }
}

export async function updateClass(schoolId: string, id: string, data: { name: string; section: string; sessionId: string }) {
  try {
    const updatedClass = await db.class.update({
      where: { id, schoolId },
      data: {
        name: data.name,
        section: data.section,
        sessionId: data.sessionId,
      },
    });

    revalidatePath("/[domain]/(dashboard)/admin/classes", "page");
    return { success: true, data: updatedClass };
  } catch (error: any) {
    console.error("Error updating class:", error);
    if (error.code === "P2002") {
      return { error: `Class ${data.name} - ${data.section} already exists for this academic session.` };
    }
    return { error: "Failed to update class." };
  }
}

export async function deleteClass(schoolId: string, id: string) {
  try {
    // Attempt deletion. It will throw P2003 if there are restricted relations like students.
    await db.class.delete({
      where: { id, schoolId },
    });

    revalidatePath("/[domain]/(dashboard)/admin/classes", "page");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting class:", error);
    if (error.code === "P2003") {
      return { error: "Cannot delete this class because it contains enrolled students or assigned subjects. Please remove them first." };
    }
    return { error: "Failed to delete class." };
  }
}

export async function getClassDetails(schoolId: string, classId: string) {
  try {
    const classData = await db.class.findUnique({
      where: { id: classId, schoolId },
      include: {
        session: true,
        _count: {
          select: { studentEnrollments: true, subjects: true },
        },
        studentEnrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: { name: true, email: true, phone: true, isActive: true },
                },
                parent: {
                  include: {
                    user: {
                      select: { name: true, phone: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { rollNumber: "asc" },
        },
        subjects: {
          include: {
            subjectMaster: true,
            classTeachers: {
              include: {
                staff: {
                  include: {
                    user: {
                      select: { name: true, email: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            subjectMaster: { name: "asc" },
          },
        },
      },
    });

    if (!classData) {
      return { error: "Class not found." };
    }

    return { success: true, data: classData };
  } catch (error) {
    console.error("Error fetching class details:", error);
    return { error: "Failed to fetch class details." };
  }
}
