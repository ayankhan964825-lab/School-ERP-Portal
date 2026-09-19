"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { PrismaClient, UserType } from "@prisma/client";

const prisma = new PrismaClient();

export async function authenticateMaster(
  prevState: any,
  formData: FormData
) {
  try {
    const rawEmail = formData.get("email") as string;
    const email = rawEmail?.trim().toLowerCase();
    const password = formData.get("password") as string;
    
    console.log("HQ AUTH ATTEMPT:", { rawEmail, email, passwordLength: password?.length });

    const user = await prisma.user.findFirst({
      where: { 
        email,
      },
    });
    
    console.log("HQ AUTH USER FOUND:", user);

    if (!user) {
      return { error: `Access denied. No user found with email: ${email}` };
    }
    
    if (user.userType !== UserType.MASTER_ADMIN) {
      return { error: `Access denied. You are a ${user.userType}, not a MASTER_ADMIN.` };
    }

    formData.append("schoolId", user.schoolId);

    // Call NextAuth signIn
    await signIn("credentials", {
      email,
      password,
      schoolId: user.schoolId,
      // We don't need redirectTo because we will catch the redirect and handle it on the client
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
