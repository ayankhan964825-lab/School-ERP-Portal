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
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      return { error: "Start date must be before end date." };
    }

    // Check for overlapping sessions
    const overlapping = await db.academicSession.findFirst({
      where: {
        schoolId,
        OR: [
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          }
        ]
      }
    });

    if (overlapping) {
      return { error: `Dates overlap with existing session: ${overlapping.name}` };
    }

    // Use transaction to ensure only one session is active
    const newSession = await db.$transaction(async (tx) => {
      // Mark all others inactive
      await tx.academicSession.updateMany({
        where: { schoolId },
        data: { isActive: false }
      });

      // Create new active session
      return await tx.academicSession.create({
        data: {
          schoolId,
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          isActive: true,
        },
      });
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
    await db.$transaction(async (tx) => {
      if (isActive) {
        // If turning ON, turn OFF all others
        await tx.academicSession.updateMany({
          where: { schoolId },
          data: { isActive: false },
        });
      }

      await tx.academicSession.update({
        where: { id: sessionId, schoolId },
        data: { isActive },
      });
    });
    
    revalidatePath("/[domain]/(dashboard)/admin/sessions", "page");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update session status." };
  }
}
