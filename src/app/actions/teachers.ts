"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getTeachers(schoolId: string) {
  try {
    const teachers = await db.user.findMany({
      where: {
        schoolId,
        userType: "TEACHER",
      },
      include: {
        staffProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, data: teachers };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch teachers." };
  }
}

export async function createTeacher(schoolId: string, data: any) {
  try {
    // Basic validation
    if (!data.email || !data.name) {
      return { error: "Email and Name are required." };
    }

    // Default password for new teachers
    const hashedPassword = await bcrypt.hash("Teacher@123", 10);

    const newTeacher = await db.$transaction(async (tx: any) => {
      // Create User
      const user = await tx.user.create({
        data: {
          schoolId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          passwordHash: hashedPassword,
          userType: "TEACHER",
          profileImage: data.profileImage || null,
        },
      });

      // Create StaffProfile
      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          empId: data.empId || null,
          qualification: data.qualification || null,
        },
      });

      return { ...user, staffProfile: profile };
    });

    revalidatePath("/[domain]/(dashboard)/admin/teachers", "page");
    return { success: true, data: newTeacher };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "A user with this email already exists." };
    }
    return { error: error.message || "Failed to create teacher." };
  }
}

export async function updateTeacher(schoolId: string, userId: string, data: any) {
  try {
    const updatedTeacher = await db.$transaction(async (tx: any) => {
      // Update User
      const user = await tx.user.update({
        where: { id: userId, schoolId },
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          profileImage: data.profileImage || null,
        },
      });

      // Update StaffProfile
      const profile = await tx.staffProfile.update({
        where: { userId: user.id },
        data: {
          empId: data.empId || null,
          qualification: data.qualification || null,
        },
      });

      return { ...user, staffProfile: profile };
    });

    revalidatePath("/[domain]/(dashboard)/admin/teachers", "page");
    return { success: true, data: updatedTeacher };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "Email is already taken." };
    }
    return { error: error.message || "Failed to update teacher." };
  }
}

export async function deleteTeacher(schoolId: string, userId: string) {
  try {
    await db.user.delete({
      where: {
        id: userId,
        schoolId,
        userType: "TEACHER",
      },
    });

    revalidatePath("/[domain]/(dashboard)/admin/teachers", "page");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2003") {
      return { error: "Cannot delete teacher. They are assigned to classes or subjects." };
    }
    return { error: error.message || "Failed to delete teacher." };
  }
}
