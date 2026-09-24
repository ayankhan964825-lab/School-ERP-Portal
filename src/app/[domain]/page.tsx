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
  // by ensuring we redirect to the absolute URL of the school's subdomain
  const isDev = process.env.NODE_ENV === "development";
  const rootDomain = isDev ? "localhost:3000" : (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "schoolsaathi.dpdns.org");
  const protocol = isDev ? "http" : "https";
  
  let schoolSubdomain = domain;
  
  // If the captured 'domain' is actually a reserved path (meaning they hit localhost:3000/admin),
  // we must fetch their actual school subdomain to redirect properly.
  if (["admin", "teacher", "student", "parent", "staff-login", "staff", "master", "hq"].includes(domain)) {
    const userSchool = await db.school.findUnique({
      where: { id: (session.user as any).schoolId },
      select: { subdomain: true }
    });
    if (userSchool) {
      schoolSubdomain = userSchool.subdomain;
    }
  }

  const baseUrl = `${protocol}://${schoolSubdomain}.${rootDomain}`;
  
  switch (role) {
    case UserType.SUPER_ADMIN:
    case UserType.STAFF:
      redirect(`${baseUrl}/admin`);
    case UserType.TEACHER:
      redirect(`${baseUrl}/teacher`);
    case UserType.STUDENT:
      redirect(`${baseUrl}/student`);
    case UserType.PARENT:
      redirect(`${baseUrl}/parent`);
    case UserType.MASTER_ADMIN:
      redirect(`${protocol}://${rootDomain}/master`);
    default:
      // Fallback
      redirect(`${protocol}://${rootDomain}/staff-login`);
  }
}

