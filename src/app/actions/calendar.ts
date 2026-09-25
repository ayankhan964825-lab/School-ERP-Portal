"use server";

import { db } from "@/lib/db";
import { ScheduleType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string(), // We'll parse this securely
  type: z.nativeEnum(ScheduleType),
  description: z.string().optional(),
});

/**
 * Normalizes a date string/object to UTC midnight to avoid timezone drift.
 */
function normalizeDateToUTC(dateInput: string | Date): Date {
  const d = new Date(dateInput);
  // We want to store exactly YYYY-MM-DDT12:00:00.000Z 
  // to ensure it never drifts to the previous or next day locally
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0));
}

export async function getSchedules(schoolId: string, month: number, year: number) {
  try {
    // Generate start and end date for the month, with some padding for the UI grid
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)); // Start of month
    startDate.setDate(startDate.getDate() - 7); // padding for calendar grid

    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // End of month
    endDate.setDate(endDate.getDate() + 7); // padding for calendar grid

    const schedules = await db.academicSchedule.findMany({
      where: {
        schoolId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return { success: true, data: schedules };
  } catch (error: any) {
    console.error("Error fetching schedules:", error);
    return { success: false, error: "Failed to fetch schedules" };
  }
}

export async function createSchedule(schoolId: string, data: any) {
  try {
    const validated = eventSchema.parse(data);
    const normalizedDate = normalizeDateToUTC(validated.date);

    const schedule = await db.academicSchedule.create({
      data: {
        schoolId,
        title: validated.title,
        date: normalizedDate,
        type: validated.type,
        description: validated.description,
      },
    });

    revalidatePath("/[domain]/(dashboard)/admin/calendar", "page");
    return { success: true, data: schedule };
  } catch (error: any) {
    console.error("Error creating schedule:", error);
    return { success: false, error: error.message || "Failed to create event" };
  }
}

export async function createMultiDaySchedule(schoolId: string, data: any, endDateInput: string) {
  try {
    const validated = eventSchema.parse(data);
    
    const start = new Date(validated.date);
    const end = new Date(endDateInput);
    
    if (end < start) {
      return { success: false, error: "End date cannot be before start date" };
    }

    const records = [];
    let current = new Date(start);

    while (current <= end) {
      records.push({
        schoolId,
        title: validated.title,
        date: normalizeDateToUTC(current),
        type: validated.type,
        description: validated.description,
      });
      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    await db.academicSchedule.createMany({
      data: records,
    });

    revalidatePath("/[domain]/(dashboard)/admin/calendar", "page");
    return { success: true, count: records.length };
  } catch (error: any) {
    console.error("Error creating multi-day schedule:", error);
    return { success: false, error: error.message || "Failed to create events" };
  }
}

export async function deleteSchedule(id: string, schoolId: string) {
  try {
    await db.academicSchedule.delete({
      where: {
        id,
        schoolId, // Strict Tenant Isolation
      },
    });

    revalidatePath("/[domain]/(dashboard)/admin/calendar", "page");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting schedule:", error);
    return { success: false, error: "Failed to delete event" };
  }
}

export async function updateSchedule(id: string, schoolId: string, data: any) {
  try {
    const validated = eventSchema.parse(data);
    const normalizedDate = normalizeDateToUTC(validated.date);

    const schedule = await db.academicSchedule.update({
      where: {
        id,
        schoolId,
      },
      data: {
        title: validated.title,
        date: normalizedDate,
        type: validated.type,
        description: validated.description,
      },
    });

    revalidatePath("/[domain]/(dashboard)/admin/calendar", "page");
    return { success: true, data: schedule };
  } catch (error: any) {
    console.error("Error updating schedule:", error);
    return { success: false, error: error.message || "Failed to update event" };
  }
}
