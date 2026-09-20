const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Testing connection...');
  try {
    const count = await prisma.school.count();
    console.log('Success, school count:', count);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
main().finally(() => prisma.$disconnect());
