import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authConfig } from "./auth.config"
import NextAuth from "next-auth"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const url = req.nextUrl;
  
  // Get hostname of request (e.g. gmacademy.erpvyapar.com, gmacademy.localhost:3000)
  const hostname = req.headers.get("host") || "";
  
  // Determine if it's local development
  const isLocal = hostname.includes("localhost");
  const baseDomain = isLocal 
    ? "localhost:3000" 
    : process.env.NEXT_PUBLIC_ROOT_DOMAIN || "erpvyapar.com"; // Fallback to erpvyapar.com if env is missing
  
  // Extract subdomain
  let subdomain = "";
  if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
    subdomain = hostname.replace(`.${baseDomain}`, "");
  }

  // We are using wildcard subdomains. 
  // Next.js App Router will map rewrites to the folder structure.

  // --- 1. Root Domain (Main Landing & HQ) ---
  if (!subdomain || hostname === baseDomain) {
    // Next.js App Router automatically handles route groups like (main)
    return NextResponse.next();
  }

  // --- 2. Subdomain Routing (Schools) ---
  // If they are on a subdomain (e.g., gmacademy.erpvyapar.com)
  // Rewrite to /[domain]/path so Next.js matches `app/[domain]/...`
  return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, svg, etc
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
