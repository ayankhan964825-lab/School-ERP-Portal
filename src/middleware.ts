import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authConfig } from "./auth.config"
import NextAuth from "next-auth"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const url = req.nextUrl;
  
  // Get hostname of request (e.g. rlacademy.schoolsaathi.dpdns.org, rlacademy.localhost:3000)
  const hostname = req.headers.get("host") || "";
  
  // Determine if it's local development
  const isLocal = hostname.includes("localhost");
  const baseDomain = isLocal 
    ? "localhost:3000" 
    : process.env.NEXT_PUBLIC_ROOT_DOMAIN || "schoolsaathi.dpdns.org";
  
  // Extract subdomain
  let subdomain = "";
  if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
    subdomain = hostname.replace(`.${baseDomain}`, "");
  }

  // --- VERCEL FREE TIER HACK ---
  // If the user visits the main Vercel project URL, treat it as the root domain (Landing Page)
  if (hostname === "schoolsaathi.dpdns.org") {
    subdomain = "";
  }
  
  // --- TESTING HACK FOR LIVE SERVER ---
  if (hostname.endsWith(".vercel.app")) {
    subdomain = "rlacademy";
  }

  // We are using wildcard subdomains. 
  // Next.js App Router will map rewrites to the folder structure.

  // --- 1. Root Domain (Main Landing & HQ) ---
  if (!subdomain || hostname === baseDomain) {
    // Next.js App Router automatically handles route groups like (main)
    return NextResponse.next();
  }

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  // Prevent infinite rewrite loops (strict matching)
  if (url.pathname === `/${subdomain}` || url.pathname.startsWith(`/${subdomain}/`)) {
    return NextResponse.next();
  }

  // Rewrite to app/[domain]/path internally
  const rewriteUrl = req.nextUrl.clone();
  
  // FIX: Vercel Edge sometimes sets req.nextUrl.hostname to an internal IP/localhost.
  // We must explicitly override it with the public host header.
  const publicHost = req.headers.get("host") || "";
  if (publicHost && !isLocal) {
    rewriteUrl.hostname = publicHost;
    rewriteUrl.protocol = "https:";
    rewriteUrl.port = "";
  }
  
  rewriteUrl.pathname = `/${subdomain}${path}`;
  return NextResponse.rewrite(rewriteUrl);
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
