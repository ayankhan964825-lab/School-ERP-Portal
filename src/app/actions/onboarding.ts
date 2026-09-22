"use server";

import { db } from "@/lib/db";
import { UserType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";

// Reserved subdomains that cannot be used by schools
const RESERVED_SUBDOMAINS = [
  "admin", "api", "www", "hq", "master", "app", "mail",
  "ftp", "dashboard", "login", "register", "start",
  "support", "help", "docs", "blog", "status",
  "schoolsaathi", "test", "dev", "staging",
];

/**
 * Check if a subdomain is available for registration
 */
export async function checkSubdomainAvailability(subdomain: string) {
  try {
    // Validate format: only lowercase letters, numbers, hyphens. Min 3, Max 30.
    const subdomainRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
    if (!subdomainRegex.test(subdomain)) {
      return {
        available: false,
        error: "Subdomain must be 3-30 characters, lowercase letters, numbers, and hyphens only.",
      };
    }

    // Check reserved words
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return { available: false, error: "This subdomain is reserved." };
    }

    // Check database
    const existing = await db.school.findUnique({
      where: { subdomain },
      select: { id: true },
    });

    if (existing) {
      return { available: false, error: "This subdomain is already taken." };
    }

    return { available: true };
  } catch (error: any) {
    console.error("checkSubdomainAvailability error:", error);
    return { available: false, error: "Could not verify availability." };
  }
}

/**
 * Provision a new school — creates School, SystemRole, and Owner User in a single transaction.
 */
export async function provisionNewSchool(data: {
  email: string;
  password: string;
  schoolName: string;
  subdomain: string;
  plan: string;
}) {
  try {
    const { email, password, schoolName, subdomain, plan } = data;

    // Validate email
    if (!email || !email.includes("@")) {
      return { success: false, error: "Invalid email address." };
    }

    // Validate password
    if (!password || password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters." };
    }

    // Validate subdomain one more time
    const availability = await checkSubdomainAvailability(subdomain);
    if (!availability.available) {
      return { success: false, error: availability.error || "Subdomain not available." };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Current academic year calculation
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();
    // Indian academic year: April to March
    const academicYearStart = currentMonth >= 3
      ? new Date(currentYear, 3, 1)  // April of current year
      : new Date(currentYear - 1, 3, 1); // April of previous year
    const academicYearEnd = currentMonth >= 3
      ? new Date(currentYear + 1, 2, 31) // March of next year
      : new Date(currentYear, 2, 31); // March of current year

    // Atomic transaction: All or nothing
    const result = await db.$transaction(async (tx) => {
      // 1. Create School
      const school = await tx.school.create({
        data: {
          name: schoolName,
          subdomain: subdomain.toLowerCase(),
          subscriptionPlan: plan || "FREE",
          academicYearStart,
          academicYearEnd,
        },
      });

      // 2. Create default Super Admin SystemRole
      const superAdminRole = await tx.systemRole.create({
        data: {
          schoolId: school.id,
          name: "Super Admin",
          permissions: ["ALL"],
          isSystem: true,
        },
      });

      // 3. Create Owner User
      const owner = await tx.user.create({
        data: {
          schoolId: school.id,
          email: email.trim().toLowerCase(),
          passwordHash,
          userType: UserType.SUPER_ADMIN,
          systemRoleId: superAdminRole.id,
          name: schoolName + " Admin",
        },
      });

      return { school, owner };
    });

    return {
      success: true,
      subdomain: result.school.subdomain,
      schoolId: result.school.id,
    };
  } catch (error: any) {
    console.error("provisionNewSchool error:", error);

    // Handle unique constraint violations
    if (error.code === "P2002") {
      if (error.meta?.target?.includes("subdomain")) {
        return { success: false, error: "This subdomain was just taken. Please try another." };
      }
      if (error.meta?.target?.includes("email")) {
        return { success: false, error: "This email is already registered." };
      }
    }

    return { success: false, error: "Failed to create school. Please try again." };
  }
}
