"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ==========================================
// VISITOR LOG ACTIONS
// ==========================================

export async function getVisitors(schoolId: string) {
  try {
    const visitors = await db.visitorLog.findMany({
      where: { schoolId },
      orderBy: { inTime: "desc" },
    });
    return { success: true, data: visitors };
  } catch (error) {
    console.error("Error fetching visitors:", error);
    return { error: "Failed to fetch visitor logs." };
  }
}

export async function createVisitor(
  schoolId: string,
  data: { name: string; phone: string; purpose: string; whomToMeet?: string }
) {
  try {
    const newVisitor = await db.visitorLog.create({
      data: {
        schoolId,
        name: data.name,
        phone: data.phone,
        purpose: data.purpose,
        whomToMeet: data.whomToMeet,
      },
    });
    revalidatePath("/[domain]/(dashboard)/admin/front-office", "page");
    return { success: true, data: newVisitor };
  } catch (error) {
    console.error("Error creating visitor:", error);
    return { error: "Failed to create visitor entry." };
  }
}

export async function markVisitorOut(schoolId: string, id: string) {
  try {
    const updated = await db.visitorLog.update({
      where: { id, schoolId },
      data: { outTime: new Date() },
    });
    revalidatePath("/[domain]/(dashboard)/admin/front-office", "page");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error marking visitor out:", error);
    return { error: "Failed to mark visitor out." };
  }
}

// ==========================================
// CALL LOG ACTIONS
// ==========================================

export async function getCallLogs(schoolId: string) {
  try {
    const calls = await db.callLog.findMany({
      where: { schoolId },
      orderBy: [
        { followUp: "desc" }, // Follow-ups on top
        { date: "desc" },
      ],
    });
    return { success: true, data: calls };
  } catch (error) {
    console.error("Error fetching call logs:", error);
    return { error: "Failed to fetch call logs." };
  }
}

export async function createCallLog(
  schoolId: string,
  data: { caller: string; phone: string; purpose: string; date: Date; followUp: boolean }
) {
  try {
    const newCall = await db.callLog.create({
      data: {
        schoolId,
        caller: data.caller,
        phone: data.phone,
        purpose: data.purpose,
        date: data.date,
        followUp: data.followUp,
      },
    });
    revalidatePath("/[domain]/(dashboard)/admin/front-office", "page");
    return { success: true, data: newCall };
  } catch (error) {
    console.error("Error creating call log:", error);
    return { error: "Failed to create call log entry." };
  }
}

// ==========================================
// COMPLAINT ACTIONS
// ==========================================

export async function getComplaints(schoolId: string) {
  try {
    const complaints = await db.complaint.findMany({
      where: { schoolId },
      orderBy: [
        { status: "asc" }, // OPEN first, then RESOLVED
        { date: "desc" },
      ],
    });
    return { success: true, data: complaints };
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return { error: "Failed to fetch complaints." };
  }
}

export async function createComplaint(
  schoolId: string,
  data: { complainant: string; phone?: string; description: string; date: Date }
) {
  try {
    const newComplaint = await db.complaint.create({
      data: {
        schoolId,
        complainant: data.complainant,
        phone: data.phone,
        description: data.description,
        date: data.date,
        status: "OPEN",
      },
    });
    revalidatePath("/[domain]/(dashboard)/admin/front-office", "page");
    return { success: true, data: newComplaint };
  } catch (error) {
    console.error("Error creating complaint:", error);
    return { error: "Failed to register complaint." };
  }
}

export async function resolveComplaint(schoolId: string, id: string) {
  try {
    const resolved = await db.complaint.update({
      where: { id, schoolId },
      data: { status: "RESOLVED" },
    });
    revalidatePath("/[domain]/(dashboard)/admin/front-office", "page");
    return { success: true, data: resolved };
  } catch (error) {
    console.error("Error resolving complaint:", error);
    return { error: "Failed to resolve complaint." };
  }
}
