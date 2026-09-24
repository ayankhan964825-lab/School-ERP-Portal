import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/staff-login",
  },
  providers: [],
  callbacks: {
    authorized(params) {
      // By default, allow all requests to pass through NextAuth middleware.
      // We handle route protection and redirection manually in our gateway pages (like `[domain]/page.tsx`) 
      // and layout pages (like `[domain]/(dashboard)/layout.tsx`).
      return true;
    },
    async redirect({ url, baseUrl }) {
      // NextAuth blocks absolute URLs to different origins (including subdomains!) by default for security.
      // We must explicitly allow redirects to our subdomains and Vercel domains.
      const isDev = process.env.NODE_ENV === "development";
      
      if (url.startsWith("/")) {
        // FIX: In Vercel Server Actions, baseUrl can incorrectly be localhost. 
        // If we append it, the user gets sent to localhost in production.
        // Returning a relative URL allows the browser to maintain the current host seamlessly.
        if (!isDev && baseUrl.includes("localhost")) {
          return url;
        }
        return `${baseUrl}${url}`;
      }
      
      if (url.includes("localhost:3000") || url.includes("schoolsaathi.dpdns.org") || url.includes("vercel.app")) {
        return url;
      }
      
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userType = (user as any).userType;
        token.schoolId = (user as any).schoolId;
        token.modulesEnabled = (user as any).modulesEnabled;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        (session.user as any).userType = token.userType as string;
        (session.user as any).schoolId = token.schoolId as string;
        (session.user as any).modulesEnabled = token.modulesEnabled;
      }
      return session;
    }
  },
} satisfies NextAuthConfig
