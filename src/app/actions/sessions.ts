"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSessions(schoolId: string) {
  try {
    const sessions = await db.academicSession.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
    });
    return { success: true, data: sessions };
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return { error: "Failed to fetch sessions." };
  }
}

export async function createSession(schoolId: string, data: { name: string; startDate: Date; endDate: Date }) {
  try {
    const newSession = await db.academicSession.create({
      data: {
        schoolId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true, // Optionally auto-set true
      },
    });

    revalidatePath("/[domain]/(dashboard)/admin/sessions", "page");
    return { success: true, data: newSession };
  } catch (error: any) {
    console.error("Error creating session:", error);
    return { error: "Failed to create academic session." };
  }
}

export async function toggleSessionStatus(schoolId: string, sessionId: string, isActive: boolean) {
  try {
    const updated = await db.academicSession.update({
      where: { id: sessionId, schoolId },
      data: { isActive },
    });
    revalidatePath("/[domain]/(dashboard)/admin/sessions", "page");
    return { success: true, data: updated };
  } catch (error) {
    return { error: "Failed to update session status." };
  }
}
