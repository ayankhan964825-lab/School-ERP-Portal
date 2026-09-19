import { PrismaClient, UserType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "master@erpvyapar.com";
  const user = await prisma.user.findFirst({
    where: { 
      email,
      userType: UserType.MASTER_ADMIN
    },
  });
  console.log("TEST RESULT:", user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
