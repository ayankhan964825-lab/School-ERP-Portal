import { PrismaClient, UserType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with SaaS Architecture...')

  // Clear existing (optional, careful in prod!)
  await prisma.user.deleteMany()
  await prisma.systemRole.deleteMany()
  await prisma.school.deleteMany()

  // Hash common password
  const passwordHash = await bcrypt.hash("password123", 12)

  // 1. Create Schools
  const school1 = await prisma.school.create({
    data: {
      name: "RL Academy",
      address: "123 RL Street, Gorakhpur",
      contact: "contact@rlacademy.in",
      academicYearStart: new Date("2025-04-01"),
      academicYearEnd: new Date("2026-03-31"),
      subscriptionPlan: "PREMIUM",
      subdomain: "rlacademy",
      customDomain: "rlacademy.in",
    }
  })



  // 2. Create System Roles (RBAC)
  const roleSuperAdminS1 = await prisma.systemRole.create({
    data: {
      schoolId: school1.id,
      name: "Super Admin",
      permissions: ["ALL"],
      isSystem: true
    }
  })
  


  const roleAdmissionsTransport = await prisma.systemRole.create({
    data: {
      schoolId: school1.id,
      name: "Admissions & Transport Manager",
      permissions: ["MANAGE_ADMISSIONS", "MANAGE_TRANSPORT"],
      isSystem: false
    }
  })

  // 3. Create Master Admin (Agency Owner - Exists in School 1 for DB simplicity, but isolated by logic)
  await prisma.user.create({
    data: {
      schoolId: school1.id,
      email: "master@erpvyapar.com",
      passwordHash,
      userType: UserType.MASTER_ADMIN,
    }
  })

  // 4. Create Multi-School Owner (Same Email, Multiple Schools)
  await prisma.user.create({
    data: {
      schoolId: school1.id,
      email: "owner@erpvyapar.com",
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      systemRoleId: roleSuperAdminS1.id
    }
  })
  


  // 5. Create Staff with Custom Role
  await prisma.user.create({
    data: {
      schoolId: school1.id,
      email: "staff@rlacademy.in",
      passwordHash,
      userType: UserType.STAFF,
      systemRoleId: roleAdmissionsTransport.id
    }
  })

  // 6. Create Teacher, Student, Parent in School 1
  const session1 = await prisma.academicSession.create({
    data: { schoolId: school1.id, name: "2025-2026", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isActive: true }
  })

  const class10A = await prisma.class.create({
    data: { schoolId: school1.id, name: "10th", section: "A", sessionId: session1.id }
  })

  await prisma.user.create({
    data: {
      schoolId: school1.id,
      email: "teacher@rlacademy.in",
      passwordHash,
      userType: UserType.TEACHER,
      staffProfile: { create: { empId: "EMP-001", qualification: "M.Sc Math" } }
    }
  })

  const parent = await prisma.user.create({
    data: {
      schoolId: school1.id,
      email: "parent@rlacademy.in",
      passwordHash,
      userType: UserType.PARENT,
      parentProfile: { create: { address: "Family Street" } }
    },
    include: { parentProfile: true }
  })

  await prisma.user.create({
    data: {
      schoolId: school1.id,
      email: "student@rlacademy.in",
      passwordHash,
      userType: UserType.STUDENT,
      studentProfile: { create: { classId: class10A.id, rollNumber: 1, parentId: parent.parentProfile!.id } }
    }
  })

  console.log('Seeding completed successfully!')
  console.log('--- TEST ACCOUNTS (Password: password123) ---')
  console.log('Master Admin:     master@erpvyapar.com')
  console.log('Multi-School Org: owner@erpvyapar.com')
  console.log('Custom RBAC:      staff@rlacademy.in (Admissions + Transport)')
  console.log('Teacher:          teacher@rlacademy.in')
  console.log('Student:          student@rlacademy.in')
  console.log('Parent:           parent@rlacademy.in')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
