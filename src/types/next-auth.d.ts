import NextAuth, { type DefaultSession, type User } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      schoolId: string;
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    role: string;
    schoolId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    schoolId?: string;
  }
}
