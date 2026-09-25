"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/**
 * Helper to check if current user can manage notices based on dynamic RBAC
 */
async function canManageNotices(schoolId: string, userId: string, userType: string) {
  if (userType === "MASTER_ADMIN" || userType === "SUPER_ADMIN") return true;

  const user = await db.user.findUnique({
    where: { id: userId, schoolId },
    include: { systemRole: true }
  });

  if (!user) return false;
  
  if (user.systemRole && user.systemRole.permissions) {
    const permissions = user.systemRole.permissions as any;
    if (permissions?.canManageNotices === true) {
      return true;
    }
  }

  return false;
}

/**
 * Fetch all notices for the Admin/Manager (includes drafts and scheduled)
 */
export async function getAdminNotices(schoolId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    
    const userId = session.user.id;
    const userType = (session.user as any).userType;
    
    // Authorization Check
    const hasAccess = await canManageNotices(schoolId, userId, userType);
    if (!hasAccess) throw new Error("Forbidden: Missing Notice Management Permission");

    const notices = await db.notice.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      include: {
        publisher: { select: { name: true, email: true } }
      }
    });
    return { success: true, data: notices };
  } catch (error: any) {
    console.error("Error fetching admin notices:", error);
    return { error: error.message || "Failed to fetch notices." };
  }
}

/**
 * Fetch targeted notices for the current end-user (Student/Teacher/Parent)
 */
export async function getMyNotices(schoolId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    
    const userId = session.user.id;
    const userType = (session.user as any).userType;

    // Fetch user details to get classId (if student) and systemRoleId
    const user = await db.user.findUnique({
      where: { id: userId, schoolId },
      include: { studentProfile: true }
    });
    
    if (!user) throw new Error("User not found");

    const systemRoleId = user.systemRoleId;
    const classId = user.studentProfile?.classId;

    // We fetch all PUBLISHED notices that are either NOT scheduled OR scheduled for past/present
    const activeNotices = await db.notice.findMany({
      where: {
        schoolId,
        isPublished: true,
        OR: [
          { publishDate: null },
          { publishDate: { lte: new Date() } }
        ]
      },
      orderBy: [
        { priority: "asc" }, // Wait, if priority is string, this sorts alphabetically (NORMAL, PINNED, URGENT). We will sort in JS later.
        { createdAt: "desc" }
      ],
      include: {
        publisher: { select: { name: true, email: true } }
      }
    });

    // Filter notices dynamically in code since JSON filtering in Prisma is complex across array elements
    const matchedNotices = activeNotices.filter(notice => {
      // If no targets are set, we assume it's private/draft-like, but UI should prevent this.
      // We check if the user matches ANY of the targets
      
      const targetRoles = Array.isArray(notice.targetRoles) ? notice.targetRoles : [];
      const targetClasses = Array.isArray(notice.targetClasses) ? notice.targetClasses : [];

      if (targetRoles.includes(userType)) return true;
      if (systemRoleId && targetRoles.includes(systemRoleId)) return true;
      if (classId && targetClasses.includes(classId)) return true;

      return false;
    });

    // Sort: URGENT first, then PINNED, then NORMAL, then by Date
    matchedNotices.sort((a, b) => {
      const priorityWeight: any = { URGENT: 3, PINNED: 2, NORMAL: 1 };
      const weightA = priorityWeight[a.priority] || 1;
      const weightB = priorityWeight[b.priority] || 1;
      
      if (weightA !== weightB) {
        return weightB - weightA; // Higher weight first
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return { success: true, data: matchedNotices };
  } catch (error: any) {
    console.error("Error fetching my notices:", error);
    return { error: error.message || "Failed to fetch notices." };
  }
}

/**
 * Create a new notice
 */
export async function createNotice(schoolId: string, data: {
  title: string;
  content: string;
  priority: string;
  targetRoles: string[];
  targetClasses: string[];
  isPublished: boolean;
  publishDate: Date | null;
  attachments?: any[];
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    
    const userId = session.user.id;
    const userType = (session.user as any).userType;
    
    const hasAccess = await canManageNotices(schoolId, userId, userType);
    if (!hasAccess) throw new Error("Forbidden: Missing Notice Management Permission");

    if (data.targetRoles.length === 0 && data.targetClasses.length === 0) {
      return { error: "You must select at least one target role or class." };
    }

    const newNotice = await db.notice.create({
      data: {
        schoolId,
        title: data.title,
        content: data.content,
        priority: data.priority,
        targetRoles: data.targetRoles,
        targetClasses: data.targetClasses,
        isPublished: data.isPublished,
        publishDate: data.publishDate,
        attachments: data.attachments || [],
        publishedBy: userId,
      }
    });

    // Revalidate paths where notices might be displayed
    revalidatePath(`/[domain]/(dashboard)/admin/notices`, "page");
    revalidatePath(`/[domain]/(dashboard)/student`, "page");
    
    return { success: true, data: newNotice };
  } catch (error: any) {
    console.error("Error creating notice:", error);
    return { error: error.message || "Failed to create notice." };
  }
}

/**
 * Delete a notice
 */
export async function deleteNotice(schoolId: string, noticeId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    
    const userId = session.user.id;
    const userType = (session.user as any).userType;
    
    const hasAccess = await canManageNotices(schoolId, userId, userType);
    if (!hasAccess) throw new Error("Forbidden: Missing Notice Management Permission");

    await db.notice.delete({
      where: { id: noticeId, schoolId }
    });

    revalidatePath(`/[domain]/(dashboard)/admin/notices`, "page");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting notice:", error);
    return { error: error.message || "Failed to delete notice." };
  }
}

/**
 * Edit/Update a notice
 */
export async function editNotice(schoolId: string, noticeId: string, data: {
  title: string;
  content: string;
  priority: string;
  targetRoles: string[];
  targetClasses: string[];
  isPublished: boolean;
  publishDate: Date | null;
  attachments?: any[];
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    
    const userId = session.user.id;
    const userType = (session.user as any).userType;
    
    const hasAccess = await canManageNotices(schoolId, userId, userType);
    if (!hasAccess) throw new Error("Forbidden: Missing Notice Management Permission");

    if (data.targetRoles.length === 0 && data.targetClasses.length === 0) {
      return { error: "You must select at least one target role or class." };
    }

    const updatedNotice = await db.notice.update({
      where: { id: noticeId, schoolId },
      data: {
        title: data.title,
        content: data.content,
        priority: data.priority,
        targetRoles: data.targetRoles,
        targetClasses: data.targetClasses,
        isPublished: data.isPublished,
        publishDate: data.publishDate,
        attachments: data.attachments || [],
      }
    });

    revalidatePath(`/[domain]/(dashboard)/admin/notices`, "page");
    revalidatePath(`/[domain]/(dashboard)/student`, "page");
    
    return { success: true, data: updatedNotice };
  } catch (error: any) {
    console.error("Error editing notice:", error);
    return { error: error.message || "Failed to edit notice." };
  }
}
