import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserType } from "@prisma/client";

export default async function SubdomainGatewayPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const session = await auth();
  
  // If no session, show a public school landing page or redirect to login
  if (!session?.user) {
    redirect("/staff-login"); 
  }

  // User is authenticated! Route them to their specific dashboard based on their role
  const role = (session.user as any).userType;
  
  switch (role) {
    case UserType.SUPER_ADMIN:
    case UserType.STAFF:
      redirect("/admin");
    case UserType.TEACHER:
      redirect("/teacher");
    case UserType.STUDENT:
      redirect("/student");
    case UserType.PARENT:
      redirect("/parent");
    // Removed ACCOUNTANT, LIBRARIAN, STORE_MANAGER as they are handled by STAFF roles
    case UserType.MASTER_ADMIN:
      // Master admin should be managed at the root domain, but if they login here, 
      // let's send them to the root domain master dashboard.
      // In a real app we'd construct the absolute URL based on process.env.NEXT_PUBLIC_APP_URL
      // but for local testing we can redirect to the login page of HQ if they get stuck.
      // Or just return a simple message. Let's just redirect to /hq.
      redirect("http://localhost:3000/master");
    default:
      // Fallback
      redirect("/staff-login");
  }
}

