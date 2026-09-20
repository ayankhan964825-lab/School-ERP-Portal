const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const school = await prisma.school.findFirst();
  console.log('Subdomain is:', school?.subdomain);
}
main().finally(() => prisma.$disconnect());
