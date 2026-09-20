"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";

export async function authenticateStaff(
  prevState: any,
  formData: FormData
) {
  try {
    const rawEmail = formData.get("email") as string;
    const email = rawEmail?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const schoolId = formData.get("schoolId") as string | null;
    const subdomain = formData.get("subdomain") as string; // From the URL

    // Step 1: Verify the school exists for this subdomain
    const currentSchool = await db.school.findUnique({
      where: { subdomain },
    });

    if (!currentSchool) {
      return { error: "Invalid school subdomain." };
    }

    // Step 2: If no specific schoolId is chosen yet, check how many schools this email belongs to
    if (!schoolId) {
      const userAccounts = await db.user.findMany({
        where: { email },
        include: { school: true },
      });

      if (userAccounts.length === 0) {
         return { error: "Invalid credentials." };
      }

      // If they own multiple schools, pause auth and ask them to select!
      if (userAccounts.length > 1) {
        return { 
          type: "MULTI_TENANT_SELECT", 
          schools: userAccounts.map(u => ({
            id: u.school.id,
            name: u.school.name,
            subdomain: u.school.subdomain,
          }))
        };
      }
      
      // If they only have 1 account, make sure it belongs to THIS subdomain
      if (userAccounts[0].schoolId !== currentSchool.id) {
         return { error: "You do not have an account at this school." };
      }

      // They have exactly 1 account and it matches this subdomain. Proceed with login!
      formData.append("schoolId", currentSchool.id);
    }

    // Construct the absolute redirect URL for the subdomain
    const isLocal = process.env.NODE_ENV !== "production";
    const domainSuffix = isLocal ? "localhost:3000" : "erpvyapar.com";
    const redirectUrl = `http${isLocal ? "" : "s"}://${currentSchool.subdomain}.${domainSuffix}/`;

    // Call NextAuth signIn
    await signIn("credentials", {
      email,
      password,
      schoolId: formData.get("schoolId"), // Use the one from formData in case it was appended after multi-tenant selection
      // We don't need redirectTo here because we will catch the redirect and handle it on the client
    });
    
    return { success: true };
  } catch (error: any) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." };
        default:
          return { error: "Something went wrong." };
      }
    }
    // Next.js throws an error with message "NEXT_REDIRECT" when redirect() is called
    if (error?.message === "NEXT_REDIRECT") {
      return { success: true };
    }
    throw error;
  }
}
