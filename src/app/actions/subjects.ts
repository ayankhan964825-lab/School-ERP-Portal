"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSubjects(schoolId: string) {
  try {
    const subjects = await db.subjectMaster.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });
    return { success: true, data: subjects };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch subjects." };
  }
}

// Temporary function to seed some dummy subjects for testing
export async function seedDummySubjects(schoolId: string) {
  try {
    const existing = await db.subjectMaster.count({ where: { schoolId } });
    if (existing === 0) {
      await db.subjectMaster.createMany({
        data: [
          { schoolId, name: "Mathematics", code: "MATH101" },
          { schoolId, name: "Science", code: "SCI101" },
          { schoolId, name: "English", code: "ENG101" },
          { schoolId, name: "Hindi", code: "HIN101" },
          { schoolId, name: "Social Studies", code: "SST101" },
        ],
      });
    }
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
