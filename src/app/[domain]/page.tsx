import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserType } from "@prisma/client";
import { db } from "@/lib/db";

export default async function SubdomainGatewayPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const session = await auth();
  
  // If no session, show a public school landing page or redirect to login
  if (!session?.user) {
    redirect("/staff-login"); 
  }

  // User is authenticated! Route them to their specific dashboard based on their role
  const role = (session.user as any).userType;
  
  // Prevent infinite loops on localhost:3000/admin 
  // If the captured 'domain' is actually a reserved path (meaning they hit localhost:3000/admin directly),
  // we must fetch their actual school subdomain to redirect properly.
  if (["admin", "teacher", "student", "parent", "staff-login", "staff", "master", "hq"].includes(domain)) {
    const userSchool = await db.school.findUnique({
      where: { id: (session.user as any).schoolId },
      select: { subdomain: true }
    });
    
    if (userSchool) {
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
         // Escape the localhost loop by sending them to their proper subdomain
         redirect(`http://${userSchool.subdomain}.localhost:3000/${domain}`);
      } else {
         // On Vercel, just fallback to relative path (Vercel hack handles subdomain in middleware)
         redirect(`/${domain}`);
      }
    }
  }

  // Normal relative redirects. This preserves the Vercel Live Server hack.
  switch (role) {
    case UserType.SUPER_ADMIN:
    case UserType.STAFF:
      redirect(`/admin`);
    case UserType.TEACHER:
      redirect(`/teacher`);
    case UserType.STUDENT:
      redirect(`/student`);
    case UserType.PARENT:
      redirect(`/parent`);
    case UserType.MASTER_ADMIN:
      const isDev = process.env.NODE_ENV === "development";
      const rootDomain = isDev ? "localhost:3000" : (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "schoolsaathi.dpdns.org");
      const protocol = isDev ? "http" : "https";
      redirect(`${protocol}://${rootDomain}/master`);
    default:
      // Fallback
      redirect(`/staff-login`);
  }
}

