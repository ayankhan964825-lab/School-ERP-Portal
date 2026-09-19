import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        schoolId: { label: "School ID", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.schoolId) {
          throw new Error("Invalid credentials payload");
        }

        const user = await prisma.user.findUnique({
          where: { 
             schoolId_email: { 
                 schoolId: credentials.schoolId as string, 
                 email: credentials.email as string 
             } 
          }
        });

        if (!user) {
          throw new Error("User not found in this school");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        if (!user.isActive) {
          throw new Error("Account is inactive.");
        }

        return {
          id: user.id,
          email: user.email,
          userType: user.userType,
          schoolId: user.schoolId,
        };
      }
    })
  ]
})
