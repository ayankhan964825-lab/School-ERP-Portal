# Technical Requirements Document (TRD) — School ERP Portal

> **Version:** 2.0 | **Status:** Final Draft
> **Architecture Pattern:** Modular Monolith (Phase 1-2) → Microservices (Phase 3+)

---

## 1. Complete Technology Stack (14 Technologies)

Every technology choice is mapped directly from the implementation plan (lines 11-28).

| # | Layer | Technology | Why (Exact Rationale) |
|---|---|---|---|
| 1 | **Frontend (Web)** | Next.js 14+ (App Router) | Available for ALL roles. Server Components for performance. SEO-friendly. |
| 2 | **Mobile App** | Flutter | Available for ALL roles. True offline-first C++ engine support (Isar/ObjectBox). Smooth UI. |
| 3 | **UI Library** | shadcn/ui + Tailwind CSS | Premium, accessible UI components. Dynamic theming per tenant. |
| 4 | **Backend API** | Next.js API Routes + tRPC | Type-safe, fullstack. No manual API client generation needed. |
| 5 | **Database** | PostgreSQL (via Supabase/Neon) | Relational data integrity. Multi-tenant ready. Row-Level Security. |
| 6 | **ORM** | Prisma | Type-safe DB queries. Automatic migration tools. |
| 7 | **Auth** | NextAuth.js v5 (Auth.js) | Role-based authentication. JWT strategy. CSRF protection. |
| 8 | **File Storage** | Cloudflare R2 / AWS S3 | Documents, photos, receipts. Zero egress fees (R2). |
| 9 | **AI Engine** | Gemini API / OpenAI API | Smart features: timetable, notices, reports, at-risk alerts. |
| 10 | **Payment** | Razorpay / Stripe | Fee collection. SmartCollect for auto-reconciliation. |
| 11 | **Realtime** | Pusher / Socket.io | Live notifications, bus GPS tracking. |
| 12 | **Deployment (Frontend)** | Vercel | Scalable cloud hosting. Edge Network. Serverless functions. |
| 13 | **Deployment (DB)** | Railway / Supabase | Managed PostgreSQL. Connection pooling. |
| 14 | **Communication** | Resend (Email) + Twilio/MSG91 (SMS) | DLT-approved transactional SMS. Professional email delivery. |

---

## 2. Three-Layer Architecture (from implementation plan lines 31-59)

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│    Next.js 14 (Web)  +  Flutter (Mobile App)     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Master│ │Super │ │Teacher│ │Student│ │Parent│  │
│  │Admin │ │Admin │ │Panel │ │Portal│ │Portal│  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
│  ┌──────┐ ┌──────┐                               │
│  │Driver│ │Account│                              │
│  │Panel │ │Office │                              │
│  └──────┘ └──────┘                               │
├─────────────────────────────────────────────────┤
│                   API LAYER                      │
│         tRPC + Next.js API Routes                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Auth/RBAC │ │AI Engine │ │Payment   │         │
│  │Middleware │ │Service   │ │Gateway   │         │
│  └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│                   DATA LAYER                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │PostgreSQL│ │Redis     │ │S3/R2     │         │
│  │(Prisma)  │ │(Cache)   │ │(Files)   │         │
│  └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────┘
```

### 2.1 Next.js 14 Performance & Caching Rules
To ensure the application maintains ultra-fast performance without stale data (Caching Issues), the following strict constraints are enforced:
- **Cache Busting via Revalidation:** All tRPC mutation endpoints that alter database state must trigger `revalidatePath` or `revalidateTag` to purge stale Next.js cache.
- **Real-Time Data Bypassing:** Real-time dashboards (e.g., Attendance, Fee Collection) must export `dynamic = 'force-dynamic'` to ensure zero caching.
- **Server/Client Separation:** The root layout, pages, and data fetching wrappers MUST be **Server Components** (Zero JS to client). Interactive elements (buttons, forms, charts) MUST be isolated into **Client Components** (`"use client"`).
- **Mobile-First Tailwind Execution:** All UI development MUST follow the `base -> sm -> md -> lg -> xl` breakpoint flow. Writing desktop-only layouts (`flex` without considering mobile stacking) is strictly prohibited to ensure iPad/Mobile compatibility.
- **Cloud-Agnostic Setup:** The codebase will use standard Next.js and Prisma features, avoiding vendor lock-in to ensure deployability on AWS, Docker, or Vercel equally.

### 2.2 Database Performance & Scale Rules (Vyapar Edge-Cases)
To prevent the "Billion Row Problem" in a multi-tenant environment, these rules are mandatory:
- **Composite B-Tree Indexes:** Every Prisma model MUST include an index on `schoolId` (e.g., `@@index([schoolId])`) to prevent Sequential Scans from crashing the DB.
- **Aggressive Autovacuum:** High-update tables (`Attendance`, `Fee_Transactions`) MUST be tuned with `autovacuum_vacuum_scale_factor = 0.05` to prevent MVCC dead tuple bloat.
- **Composite Unique Constraints:** Unique constraints involving people must be composite with `schoolId` (e.g., `@@unique([phone, schoolId])`) to allow a parent to register in multiple schools using the same phone number.
- **Soft Deletion:** NEVER use hard deletes. All core tables must implement `status IN ('active', 'suspended', 'deleted')` to preserve financial history (Cascading Deletes are strictly forbidden for tenants/users).
- **Atomic Transactions (Finance):** `SELECT -> UPDATE` is strictly prohibited for Fee/Wallet updates. MUST use Prisma `$transaction` or `increment`/`decrement` to prevent double-charging race conditions.
- **Middleware Fast-Fail (DDoS Shield):** `middleware.ts` MUST instantly `return NextResponse.next()` for all static assets (`/_next/`, `*.png`, `*.css`) to prevent Edge function timeouts and database connection exhaustion.
- **Private Data Vault:** Sensitive files (Report Cards, Medical docs) MUST be stored in private R2 buckets and served ONLY via API-generated Pre-Signed URLs with a 5-minute expiry. Watermarks ("Downloaded by User X") will be applied dynamically.

---

## 3. Complete Database Schema (Prisma) — All 20 Tables

Every table field below is extracted directly from the implementation plan (lines 63-187).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ==========================================
// SECTION A: MULTI-TENANT FOUNDATION (2 Tables)
// Source: Implementation Plan Lines 66-76
// ==========================================

model School {
  id                  String   @id @default(uuid())
  name                String
  logo                String?           // URL to R2/S3
  address             String?
  contact             String?           // Phone/email
  subscriptionPlan    String   @default("FREE") // FREE | BASIC | PREMIUM
  academicYearStart   DateTime
  academicYearEnd     DateTime
  settings            Json?             // JSON blob: grading scale, SMS prefs, theme colors
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  users               User[]
  classes             Class[]
  subjects            SubjectMaster[]
  feeStructures       FeeStructure[]
  notices             Notice[]
  vehicles            Vehicle[]
  routes              Route[]
  academicSchedules   AcademicSchedule[]
  expenses            Expense[]
  admissionEnquiries  AdmissionEnquiry[]
}

enum Role {
  MASTER_ADMIN
  SUPER_ADMIN
  ADMIN_STAFF
  TEACHER
  STUDENT
  PARENT
  ACCOUNTANT
  LIBRARIAN
  STORE_MANAGER
}

enum BookStatus {
  AVAILABLE
  ISSUED
  LOST
}

enum PaymentMode {
  CASH
  UPI
  ONLINE
  CHEQUE
}

model User {
  id             String    @id @default(uuid())
  schoolId       String
  school         School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  email          String    @unique
  phone          String?
  passwordHash   String
  role           Role
  profileImage   String?           // URL to R2/S3
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Role-specific profiles (nullable)
  teacherProfile    TeacherProfile?
  studentProfile    StudentProfile?
  parentProfile     ParentProfile?
  leaveApplications LeaveApplication[]
  publishedNotices  Notice[]          @relation("NoticePublisher")

  @@index([schoolId, role])
  @@index([schoolId, email])
}

// ==========================================
// SECTION B: ACADEMIC MODULE (6 Tables)
// Source: Implementation Plan Lines 79-107
// ==========================================

model Class {
  id            String   @id @default(uuid())
  schoolId      String
  school        School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name          String   // e.g., "10th"
  section       String   // e.g., "A"
  academicYear  String   // e.g., "2026-2027"

  // Relations
  subjects      Subject[]
  students      StudentProfile[]
  timetable     TimetablePeriod[]
  exams         Exam[]
  homework      Homework[]
  attendances   Attendance[]
  syllabi       Syllabus[]

  @@unique([schoolId, name, section, academicYear])
}

model SubjectMaster {
  id        String   @id @default(uuid())
  schoolId  String
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name      String   // e.g., "Mathematics"
  code      String   // e.g., "MATH101"

  subjects  Subject[]

  @@unique([schoolId, code])
}

model Subject {
  id              String        @id @default(uuid())
  classId         String
  class           Class         @relation(fields: [classId], references: [id], onDelete: Cascade)
  subjectMasterId String
  subjectMaster   SubjectMaster @relation(fields: [subjectMasterId], references: [id])

  classTeachers   ClassTeacher[]
  timetable       TimetablePeriod[]
  exams           Exam[]
  homework        Homework[]
  syllabi         Syllabus[]
  results         Result[]
}

// Implementation Plan Line 89-92: ClassTeacher mapping
model ClassTeacher {
  id            String   @id @default(uuid())
  teacherId     String
  teacher       TeacherProfile @relation(fields: [teacherId], references: [id])
  classId       String
  subjectId     String
  subject       Subject  @relation(fields: [subjectId], references: [id])
  isClassTeacher Boolean @default(false) // Only one per class
  assignedBy    String   // super_admin_id who made this assignment

  @@unique([teacherId, classId, subjectId])
}

// Implementation Plan Line 94-97: Timetable
model TimetablePeriod {
  id            String   @id @default(uuid())
  classId       String
  class         Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  subjectId     String
  subject       Subject  @relation(fields: [subjectId], references: [id])
  teacherId     String
  teacher       TeacherProfile @relation(fields: [teacherId], references: [id])
  dayOfWeek     String   // MON, TUE, WED, THU, FRI, SAT
  startTime     String   // "08:00"
  endTime       String   // "08:45"
  room          String?
  isAiGenerated Boolean  @default(false) // Tracks if AI created this slot

  @@unique([classId, dayOfWeek, startTime])
}

// Implementation Plan Line 99-101: AcademicSchedule
enum ScheduleType {
  EXAM
  HOLIDAY
  EVENT
}

model AcademicSchedule {
  id          String       @id @default(uuid())
  schoolId    String
  school      School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  title       String       // e.g., "Diwali Holiday"
  date        DateTime     @db.Date
  type        ScheduleType
  description String?
}

// Implementation Plan Line 103-106: Syllabus
model Syllabus {
  id            String   @id @default(uuid())
  classId       String
  class         Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  subjectId     String
  subject       Subject  @relation(fields: [subjectId], references: [id])
  academicYear  String
  // JSON array of { topic_name, expected_hours, is_completed, completion_date }
  topics        Json
  uploadedBy    String   // super_admin_id or teacher_id

  @@unique([classId, subjectId, academicYear])
}

// ==========================================
// SECTION C: ROLE PROFILES (4 Tables)
// ==========================================

model TeacherProfile {
  id             String   @id @default(uuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  empId          String?
  qualification  String?

  classTeachers  ClassTeacher[]
  timetable      TimetablePeriod[]
}

model StudentProfile {
  id               String   @id @default(uuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  classId          String
  class            Class    @relation(fields: [classId], references: [id])
  rollNumber       Int
  parentId         String?
  parent           ParentProfile? @relation(fields: [parentId], references: [id])
  virtualAccountId String?  @unique // Razorpay SmartCollect VA

  attendances      Attendance[]
  results          Result[]
  feePayments      FeePayment[]

  @@unique([classId, rollNumber])
}

model ParentProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  address     String?

  children    StudentProfile[]
}

// Transport Staff are managed by Admin, they do not have User logins
model TransportStaff {
  id                String   @id @default(uuid())
  schoolId          String
  school            School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name              String
  phone             String
  licenseNumber     String?
  aadharNumber      String?
  experienceYears   Int?
  policeVerified    Boolean  @default(false)
  role              String   // TRANSPORT_STAFF
  isActive          Boolean  @default(true)

  assignedVehicles  Vehicle[]
  assignedRoutes    Route[]
}

// ==========================================
// SECTION D: ATTENDANCE & RESULTS (3 Tables)
// Source: Implementation Plan Lines 109-131
// ==========================================

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
}

model Attendance {
  id          String           @id @default(uuid())
  studentId   String
  student     StudentProfile   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  classId     String
  class       Class            @relation(fields: [classId], references: [id])
  date        DateTime         @db.Date
  status      AttendanceStatus
  markedBy    String           // teacher_id who marked it
  syncedAt    DateTime         @default(now()) // For offline conflict resolution

  @@unique([studentId, date]) // One record per student per day
}

enum ExamType {
  UNIT_TEST
  MID_TERM
  FINAL
}

model Exam {
  id            String   @id @default(uuid())
  schoolId      String
  name          String   // e.g., "Unit Test 1"
  classId       String
  class         Class    @relation(fields: [classId], references: [id])
  subjectId     String
  subject       Subject  @relation(fields: [subjectId], references: [id])
  date          DateTime @db.Date
  totalMarks    Int
  passingMarks  Int
  type          ExamType

  results       Result[]
}

model Result {
  id             String   @id @default(uuid())
  examId         String
  exam           Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  studentId      String
  student        StudentProfile @relation(fields: [studentId], references: [id])
  marksObtained  Float
  grade          String?  // Auto-calculated: A+, A, B+, etc.
  remarks        String?
  uploadedBy     String   // teacher_id

  @@unique([examId, studentId])
}

// ==========================================
// SECTION E: HOMEWORK (1 Table)
// Source: Implementation Plan Lines 126-130
// ==========================================

model Homework {
  id          String   @id @default(uuid())
  classId     String
  class       Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  subjectId   String
  subject     Subject  @relation(fields: [subjectId], references: [id])
  teacherId   String
  title       String
  description String?
  dueDate     DateTime @db.Date
  attachments Json?    // JSON array of file URLs in R2/S3
  createdAt   DateTime @default(now())
}

// ==========================================
// ==========================================
// SECTION F: TRANSPORTATION (2 Tables)
// Source: Implementation Plan Lines 133-147
// ==========================================

model Vehicle {
  id          String   @id @default(uuid())
  schoolId    String
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  busNumber   String
  capacity    Int
  isActive    Boolean  @default(true)

  routes      Route[]
  driverId    String?
  driver      TransportStaff? @relation(fields: [driverId], references: [id])
}

model Route {
  id            String   @id @default(uuid())
  schoolId      String
  school        School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name          String   // e.g., "Route 5 - South Delhi"
  vehicleId     String
  vehicle       Vehicle  @relation(fields: [vehicleId], references: [id])
  // JSON array of { name: string, lat: number, lng: number, time: string }
  stops         Json
  conductorId   String?
  conductor     TransportStaff? @relation(fields: [conductorId], references: [id])
}

// ==========================================
// SECTION G: FEE & FINANCE (3 Tables)
// Source: Implementation Plan Lines 150-168
// ==========================================

enum FeeType {
  TUITION
  TRANSPORT
  LIBRARY
  SPORTS
}

enum FeeFrequency {
  MONTHLY
  QUARTERLY
  ANNUAL
}

enum FeeStatus {
  PAID
  PARTIAL
  PENDING
  OVERDUE
}

model FeeStructure {
  id            String       @id @default(uuid())
  schoolId      String
  school        School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classId       String
  academicYear  String
  feeType       FeeType
  amount        Float
  dueDate       DateTime     @db.Date
  frequency     FeeFrequency
  lateFeePerDay Float        @default(0)

  payments      FeePayment[]
}

model FeePayment {
  id               String      @id @default(uuid())
  studentId        String
  student          StudentProfile @relation(fields: [studentId], references: [id])
  feeStructureId   String
  feeStructure     FeeStructure @relation(fields: [feeStructureId], references: [id])
  amountPaid       Float       @default(0)
  paymentDate      DateTime?
  paymentMethod    String?     // UPI, Card, Cash, Cheque, NEFT
  transactionId    String?     // Razorpay payment reference
  receiptNumber    String?     @unique // System-generated unique receipt
  status           FeeStatus   @default(PENDING)
  onlineReceiptUrl String?     // PDF download link in R2

  @@unique([studentId, feeStructureId])
}

model Expense {
  id                String   @id @default(uuid())
  schoolId          String
  school            School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  category          String   // e.g., "Electricity", "Stationery"
  amount            Float
  description       String?
  date              DateTime @db.Date
  approvedBy        String?  // Principal approval for large expenses
  receiptAttachment String?  // Vendor bill/invoice scan URL
}

// ==========================================
// SECTION H: COMMUNICATION (2 Tables)
// Source: Implementation Plan Lines 171-186
// ==========================================

model Notice {
  id            String   @id @default(uuid())
  schoolId      String
  school        School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  title         String
  content       String   // Rich text / HTML
  targetRoles   Json?    // JSON array: ["TEACHER", "PARENT"]
  targetClasses Json?    // JSON array: ["class_10_A"]
  publishedBy   String
  publisher     User     @relation("NoticePublisher", fields: [publishedBy], references: [id])
  isPublished   Boolean  @default(false) // Draft vs Published
  publishDate   DateTime?
  attachments   Json?    // JSON array of file URLs
  createdAt     DateTime @default(now())
}

enum LeaveType {
  SICK
  CASUAL
  PERSONAL
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

model LeaveApplication {
  id                      String      @id @default(uuid())
  userId                  String
  user                    User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  leaveType               LeaveType
  role                    Role        // TEACHER or STUDENT
  fromDate                DateTime    @db.Date
  toDate                  DateTime    @db.Date
  reason                  String
  status                  LeaveStatus @default(PENDING)
  approvedBy              String?     // Who approved/rejected
  // AI suggests which free teacher can substitute
  aiSubstituteSuggestion  Json?
  createdAt               DateTime    @default(now())
}

// ==========================================
// SECTION I: ADMISSION & ONBOARDING (1 Table)
// ==========================================

enum AdmissionStatus {
  ENQUIRY
  APPLIED
  ADMITTED
  REJECTED
}

enum AdmissionSource {
  MANUAL       // Staff Data Entry Mode
  QR_CODE      // Parent scanned QR at reception
  BULK_IMPORT  // CSV/Excel batch upload
}

enum AdmissionFeeStatus {
  PAID
  PARTIAL
  PENDING
  WAIVED
}

model AdmissionEnquiry {
  id                       String              @id @default(uuid())
  schoolId                 String
  school                   School              @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  studentName              String
  dob                      DateTime            @db.Date
  gender                   String              // MALE | FEMALE | OTHER
  parentName               String
  parentPhone              String
  parentEmail              String?
  previousSchool           String?
  previousClass            String?
  appliedForClass          String              // Target class for admission
  source                   AdmissionSource     @default(MANUAL)
  status                   AdmissionStatus     @default(ENQUIRY)
  documents                Json?               // JSON array of R2 URLs (OPTIONAL at admission)
  documentsPending         Boolean             @default(true)  // true = docs skipped during fast entry
  admissionFeeStatus       AdmissionFeeStatus  @default(PENDING)
  admissionFeeAmount       Float               @default(0)  // Total admission fee for this class
  admissionFeePaid         Float               @default(0)  // Amount actually collected
  admissionFeeDiscount     Float               @default(0)  // Principal's waiver amount
  admissionFeeDiscountReason String?           // e.g., "Sibling Discount", "Staff Ward"
  notes                    String?             // Admin staff remarks
  siblingStudentId         String?             // FK to existing StudentProfile if sibling exists
  createdStudentId         String?             // FK to StudentProfile created on ADMITTED
  createdParentId          String?             // FK to ParentProfile created/reused on ADMITTED
  createdAt                DateTime            @default(now())
  updatedAt                DateTime            @updatedAt

  @@index([schoolId, status])
  @@index([schoolId, parentPhone])
  @@index([schoolId, source])  // Filter by admission channel
}

// ==========================================
// LIBRARY MANAGEMENT
// ==========================================

model Book {
  id               String      @id @default(cuid())
  schoolId         String
  isbn             String?
  title            String
  author           String
  category         String
  totalCopies      Int         @default(1)
  availableCopies  Int         @default(1)
  school           School      @relation(fields: [schoolId], references: [id])
  copies           BookCopy[]
  createdAt        DateTime    @default(now())
}

model BookCopy {
  id               String      @id @default(cuid())
  bookId           String
  barcodeId        String      @unique
  status           BookStatus  @default(AVAILABLE) // AVAILABLE, ISSUED, LOST
  book             Book        @relation(fields: [bookId], references: [id])
  issues           BookIssue[]
}

model BookIssue {
  id               String      @id @default(cuid())
  schoolId         String
  copyId           String
  studentId        String
  issueDate        DateTime    @default(now())
  dueDate          DateTime
  returnDate       DateTime?
  fineAmount       Float       @default(0)
  finePaid         Boolean     @default(false)
  school           School      @relation(fields: [schoolId], references: [id])
  copy             BookCopy    @relation(fields: [copyId], references: [id])
  student          StudentProfile @relation(fields: [studentId], references: [id])
}

// ==========================================
// INVENTORY & STORE
// ==========================================

model InventoryItem {
  id               String      @id @default(cuid())
  schoolId         String
  category         String      // UNIFORM, BOOK, STATIONERY
  name             String
  variant          String?     // e.g., "Size 32"
  price            Float
  stockCount       Int         @default(0)
  lowStockAlert    Int         @default(5)
  school           School      @relation(fields: [schoolId], references: [id])
  sales            SaleItem[]
}

model StoreSale {
  id               String      @id @default(cuid())
  schoolId         String
  studentId        String?
  parentPhone      String?
  totalAmount      Float
  paymentMode      PaymentMode // CASH, UPI, ONLINE
  status           String      @default("PAID")
  receiptUrl       String?
  school           School      @relation(fields: [schoolId], references: [id])
  student          StudentProfile? @relation(fields: [studentId], references: [id])
  items            SaleItem[]
  createdAt        DateTime    @default(now())
}

model SaleItem {
  id               String      @id @default(cuid())
  saleId           String
  itemId           String
  quantity         Int
  unitPrice        Float
  sale             StoreSale   @relation(fields: [saleId], references: [id])
  item             InventoryItem @relation(fields: [itemId], references: [id])
}

// ==========================================
// HR & PAYROLL
// ==========================================

model StaffSalary {
  id               String      @id @default(cuid())
  schoolId         String
  userId           String      // Teacher or Staff
  baseSalary       Float
  hra              Float       @default(0)
  allowances       Float       @default(0)
  pfDeduction      Float       @default(0)
  tdsDeduction     Float       @default(0)
  school           School      @relation(fields: [schoolId], references: [id])
  user             User        @relation(fields: [userId], references: [id])
  payslips         Payslip[]
}

model Payslip {
  id               String      @id @default(cuid())
  schoolId         String
  salaryId         String
  monthYear        String      // e.g., "08-2026"
  payableDays      Int
  grossSalary      Float
  totalDeductions  Float
  netSalary        Float
  status           String      @default("GENERATED") // PAID, PENDING
  pdfUrl           String?
  school           School      @relation(fields: [schoolId], references: [id])
  salary           StaffSalary @relation(fields: [salaryId], references: [id])
  createdAt        DateTime    @default(now())
}

// ==========================================
// CERTIFICATE & REPORT CARD ENGINE
// ==========================================

model IssuedCertificate {
  id               String      @id @default(cuid())
  schoolId         String
  studentId        String
  type             String      // TC, BONAFIDE, CHARACTER
  qrHash           String      @unique
  pdfUrl           String
  issuedBy         String      // UserId of Admin
  school           School      @relation(fields: [schoolId], references: [id])
  student          StudentProfile @relation(fields: [studentId], references: [id])
  createdAt        DateTime    @default(now())
}

model ReportCard {
  id               String      @id @default(cuid())
  schoolId         String
  studentId        String
  classId          String
  term             String      // TERM_1, TERM_2, FINAL
  totalMarks       Float
  percentage       Float
  grade            String      // e.g., A1, B2
  aiRemarks        String?     @db.Text
  pdfUrl           String?
  school           School      @relation(fields: [schoolId], references: [id])
  student          StudentProfile @relation(fields: [studentId], references: [id])
  createdAt        DateTime    @default(now())
}

model ComplianceExportLog {
  id               String      @id @default(cuid())
  schoolId         String
  requestedBy      String      // UserId of SuperAdmin/MasterAdmin
  reportType       String      // UDISE_PLUS, CBSE_OASIS, STATE_BOARD
  academicYear     String      // e.g., 2026-27
  status           String      // PENDING, COMPLETED, FAILED
  downloadUrl      String?     // S3/R2 URL for the generated Excel/PDF
  school           School      @relation(fields: [schoolId], references: [id])
  createdAt        DateTime    @default(now())
}
```

---

## 4. Complete .env Configuration

```bash
# ==========================================
# 1. CORE APPLICATION
# ==========================================
NEXT_PUBLIC_APP_URL="https://erp.schoolapp.com"
NODE_ENV="production"

# ==========================================
# 2. DATABASE (Neon Serverless Postgres)
# ==========================================
DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
DIRECT_URL="postgres://user:pass@host/db?sslmode=require"

# ==========================================
# 3. AUTHENTICATION (NextAuth.js v5)
# ==========================================
AUTH_SECRET="your_32_byte_cryptographic_random_string"
AUTH_URL="https://erp.schoolapp.com/api/auth"

# ==========================================
# 4. REDIS CACHE (Upstash)
# ==========================================
UPSTASH_REDIS_REST_URL="https://region.upstash.io"
UPSTASH_REDIS_REST_TOKEN="token_hash"

# ==========================================
# 5. FILE STORAGE (Cloudflare R2)
# ==========================================
R2_ACCESS_KEY_ID="cloudflare_key"
R2_SECRET_ACCESS_KEY="cloudflare_secret"
R2_BUCKET_NAME="school-erp-documents"
R2_ACCOUNT_ID="cloudflare_account_id"
NEXT_PUBLIC_R2_PUBLIC_URL="https://cdn.schoolapp.com"

# ==========================================
# 6. AI ENGINE (Google Gemini)
# ==========================================
GEMINI_API_KEY="AIzaSy_google_gemini_key"

# ==========================================
# 7. PAYMENT GATEWAY (Razorpay)
# ==========================================
RAZORPAY_KEY_ID="rzp_live_12345"
RAZORPAY_KEY_SECRET="rzp_secret_67890"
RAZORPAY_WEBHOOK_SECRET="webhook_verification_secret"

# ==========================================
# 8. COMMUNICATION (SMS + Email)
# ==========================================
MSG91_AUTH_KEY="msg91_auth_token"
MSG91_SENDER_ID="SCHERP"
RESEND_API_KEY="re_api_key"

# ==========================================
# 9. REALTIME (Pusher)
# ==========================================
PUSHER_APP_ID="app_id"
PUSHER_KEY="pusher_key"
PUSHER_SECRET="pusher_secret"
PUSHER_CLUSTER="ap2"
```

---

## 5. Complete Project Folder Structure (from implementation plan lines 300-359)

```
erp-portal/
├── prisma/
│   └── schema.prisma              # Complete database schema (shown above)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/               # Public auth pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/          # Protected dashboard routes (7 role panels)
│   │   │   ├── master/           # MASTER_ADMIN Panel
│   │   │   │   ├── page.tsx      # Global dashboard
│   │   │   │   ├── schools/      # School management
│   │   │   │   └── billing/      # Subscription management
│   │   │   ├── admin/            # SUPER_ADMIN (Principal) Panel
│   │   │   │   ├── page.tsx      # School overview dashboard
│   │   │   │   ├── classes/      # Class CRUD
│   │   │   │   ├── teachers/     # Teacher management
│   │   │   │   ├── students/     # Student enrollment
│   │   │   │   ├── parents/      # Parent account linking
│   │   │   │   ├── notices/      # Notice board
│   │   │   │   ├── timetable/    # AI Timetable Generator
│   │   │   │   ├── syllabus/     # Syllabus management
│   │   │   │   ├── fees/         # Fee structure setup
│   │   │   │   ├── transport/    # Vehicle/Route management
│   │   │   │   ├── calendar/     # Academic schedule
│   │   │   │   └── reports/      # All reports view
│   │   │   ├── teacher/          # TEACHER Panel
│   │   │   │   ├── page.tsx      # Teacher dashboard
│   │   │   │   ├── attendance/   # Attendance marking
│   │   │   │   ├── homework/     # Homework creation
│   │   │   │   ├── results/      # Marks upload
│   │   │   │   ├── syllabus/     # Progress update
│   │   │   │   ├── schedule/     # Own timetable view
│   │   │   │   └── leave/        # Leave application
│   │   │   ├── student/          # STUDENT Portal
│   │   │   │   ├── page.tsx      # Student dashboard
│   │   │   │   ├── attendance/   # Attendance calendar
│   │   │   │   ├── results/      # Report cards view
│   │   │   │   ├── homework/     # Homework list
│   │   │   │   ├── timetable/    # Schedule view
│   │   │   │   ├── syllabus/     # Course progress
│   │   │   │   ├── notices/      # Notice board
│   │   │   │   ├── transport/    # Bus/Route info
│   │   │   │   └── leave/        # Leave application
│   │   │   ├── parent/           # PARENT Portal
│   │   │   │   ├── page.tsx      # Parent dashboard (child selector)
│   │   │   │   ├── attendance/   # Child attendance calendar
│   │   │   │   ├── results/      # Child marks + AI report
│   │   │   │   ├── fees/         # Payment + receipt download
│   │   │   │   ├── syllabus/     # Course progress view
│   │   │   │   ├── transport/    # Bus tracking
│   │   │   │   ├── teachers/     # Teacher info
│   │   │   │   ├── notices/      # Announcements
│   │   │   │   ├── leave/        # Approve child leave
│   │   │   │   └── vault/        # Document vault
│   │   │   ├── driver/           # DRIVER Panel
│   │   │   │   ├── page.tsx      # Driver dashboard
│   │   │   │   ├── profile/      # Personal details, license
│   │   │   │   ├── route/        # Assigned route + stops
│   │   │   │   └── vehicle/      # Vehicle status
│   │   │   └── accountant/       # ACCOUNTANT Panel
│   │   │       ├── page.tsx      # Collection dashboard
│   │   │       ├── collections/  # Today's collections
│   │   │       ├── receipts/     # Receipt generation
│   │   │       ├── expenses/     # Expense management
│   │   │       ├── reconcile/    # SmartCollect dashboard
│   │   │       └── reports/      # Financial reports
│   │   │   └── staff/            # ADMIN_STAFF (Front Office) Panel
│   │   │       ├── page.tsx      # Admission dashboard
│   │   │       ├── admissions/   # New admission form + register
│   │   │       ├── enquiries/    # Pre-admission enquiry tracking
│   │   │       ├── credentials/  # Generate & print login credentials
│   │   │       └── siblings/     # Sibling linking management
│   │   ├── api/                  # API Routes
│   │   │   ├── trpc/            # tRPC handler
│   │   │   │   └── [trpc]/
│   │   │   │       └── route.ts
│   │   │   └── webhooks/
│   │   │       └── razorpay/    # SmartCollect webhook
│   │   │           └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx              # Landing Page (Marketing)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button, Input, Card, etc.)
│   │   ├── dashboard/            # Dashboard widget components
│   │   ├── forms/                # Form components (zod + react-hook-form)
│   │   ├── tables/               # Data table components
│   │   └── charts/               # Analytics chart components
│   ├── lib/
│   │   ├── auth.ts               # NextAuth configuration
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── utils.ts              # Utility functions (cn, formatDate, etc.)
│   │   ├── ai/                   # AI service functions
│   │   │   ├── timetable-generator.ts   # Constraint satisfaction + Gemini
│   │   │   ├── leave-suggester.ts       # Free teacher finder + ranking
│   │   │   └── notice-writer.ts         # Auto-draft + translate notices
│   │   └── payment/              # Razorpay integration
│   │       ├── razorpay.ts       # SDK initialization
│   │       └── smartcollect.ts   # Virtual account management
│   ├── server/
│   │   ├── trpc.ts               # tRPC initialization
│   │   └── routers/              # tRPC routers (9 domain routers)
│   │       ├── school.ts         # School CRUD (Master Admin)
│   │       ├── user.ts           # User management
│   │       ├── class.ts          # Class CRUD
│   │       ├── attendance.ts     # Attendance mark/sync
│   │       ├── result.ts         # Exam + Marks upload
│   │       ├── fee.ts            # Fee structures + payments
│   │       ├── transport.ts      # Vehicles + Routes
│   │       ├── notice.ts         # Notice CRUD + AI drafting
│   │       ├── leave.ts          # Leave applications + AI substitute
│   │       └── admission.ts      # Admission CRUD + sibling linking + credential gen
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript types/interfaces
│   └── styles/
│       └── globals.css           # Tailwind base + CSS variables
├── public/
│   └── assets/                   # Static assets (icons, images)
├── .env                          # Environment variables
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 6. API Contract Specifications (tRPC Routers — All 9 Routers)

### 6.1 Router: `school.ts` (Master Admin Only)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `create` | Mutation | `{ name, address, contact, subscriptionPlan }` | `School` |
| `getAll` | Query | `{ page, limit, search? }` | `{ schools: School[], total: number }` |
| `getById` | Query | `{ id }` | `School` |
| `update` | Mutation | `{ id, name?, logo?, settings? }` | `School` |
| `suspend` | Mutation | `{ id }` | `{ success: boolean }` |

### 6.2 Router: `user.ts` (Super Admin + Master Admin)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `create` | Mutation | `{ email, phone, role, schoolId, classId? }` | `User` |
| `getBySchool` | Query | `{ schoolId, role?, page, limit }` | `{ users: User[], total }` |
| `update` | Mutation | `{ id, phone?, isActive? }` | `User` |
| `deactivate` | Mutation | `{ id }` | `{ success }` |
| `bulkImport` | Mutation | `{ csvData: StudentRow[] }` | `{ imported: number, errors: Error[] }` |

### 6.3 Router: `class.ts`
| Procedure | Type | Input | Output |
|---|---|---|---|
| `create` | Mutation | `{ name, section, academicYear }` | `Class` |
| `getAll` | Query | `{ schoolId }` | `Class[]` |
| `assignTeacher` | Mutation | `{ teacherId, classId, subjectId, isClassTeacher }` | `ClassTeacher` |

### 6.4 Router: `attendance.ts`
| Procedure | Type | Input | Output |
|---|---|---|---|
| `markBulk` | Mutation | `{ classId, date, records: [{ studentId, status, timestamp }] }` | `{ success, syncedCount, conflicts }` |
| `getForClassDate` | Query | `{ classId, date }` | `Attendance[]` |
| `getStudentStats` | Query | `{ studentId, month, year }` | `{ present, absent, late, percentage }` |
| `getStudentCalendar` | Query | `{ studentId, month, year }` | `AttendanceCalendarDay[]` |

### 10.11 Exam & Result (`exam.ts` & `result.ts`)
| Route | Type | Input | Returns |
|---|---|---|---|
| `createExam` | Mutation | `{ name, term, classes }` | `Exam` |
| `updateMarksInline` | Mutation | `{ studentId, subjectId, marks, examId }` | `Result` (auto-calculates grade) |
| `downloadMarksTemplate` | Query | `{ classId, subjectId, examId }` | `{ templateUrl: string }` |
| `uploadMarksExcel` | Mutation | `{ classId, subjectId, examId, excelData: Json }` | `Result[]` (bulk upsert) |
| `calculateGrades` | Mutation | `{ classId, term }` | `ReportCard[]` (batch processed) |
| `uploadMarks` | Mutation | `{ examId, marks: [{ studentId, marksObtained, remarks? }] }` | `{ uploaded: number }` |
| `getStudentResults` | Query | `{ studentId }` | `ResultWithExam[]` |
| `generateAiReport` | Mutation | `{ studentId }` | `{ narrative: string }` |

### 6.6 Router: `fee.ts`
| Procedure | Type | Input | Output |
|---|---|---|---|
| `createStructure` | Mutation | `{ classId, feeType, amount, dueDate, frequency, lateFee }` | `FeeStructure` |
| `getStudentDues` | Query | `{ studentId }` | `FeePayment[]` |
| `initiatePayment` | Mutation | `{ paymentIds: string[] }` | `{ razorpayOrderId, amount, key }` |
| `recordOffline` | Mutation | `{ studentId, feeStructureId, amount, method }` | `FeePayment` |
| `downloadReceipt` | Query | `{ paymentId }` | `{ url: string }` |

### 6.7 Router: `transport.ts`
| Procedure | Type | Input | Output |
|---|---|---|---|
| `createVehicle` | Mutation | `{ busNumber, capacity }` | `Vehicle` |
| `createRoute` | Mutation | `{ name, vehicleId, stops, driverId }` | `Route` |
| `getStudentRoute` | Query | `{ studentId }` | `RouteWithVehicleAndDriver` |
| `getStaffRoute` | Query | `{ driverId }` | `RouteWithStops` |

### 6.8 Router: `notice.ts`
| Procedure | Type | Input | Output |
|---|---|---|---|
| `create` | Mutation | `{ title, content, targetRoles?, targetClasses?, publishDate? }` | `Notice` |
| `getForUser` | Query | `{ userId, role, classId? }` | `Notice[]` |
| `aiDraft` | Mutation | `{ topic: string }` | `{ titleEn, contentEn, contentHi }` |

### 6.9 Router: `leave.ts`
| Procedure | Type | Input | Output |
|---|---|---|---|
| `apply` | Mutation | `{ leaveType, fromDate, toDate, reason }` | `LeaveApplication` |
| `approve` | Mutation | `{ id }` | `LeaveApplication` |
| `reject` | Mutation | `{ id, reason }` | `LeaveApplication` |
| `getSubstituteSuggestion` | Query | `{ teacherId, date }` | `{ suggestions: TeacherSuggestion[] }` |

### 6.10 Router: `admission.ts` (Admin Staff + Super Admin)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `createEnquiry` | Mutation | `{ studentName, dob, gender, parentName, parentPhone, appliedForClass, source: MANUAL }` | `AdmissionEnquiry` |
| `createQrEnquiry` | Mutation | `{ studentName, parentPhone, appliedForClass }` (minimal 3-field form from QR) | `AdmissionEnquiry (source: QR_CODE, status: ENQUIRY)` |
| `getAll` | Query | `{ schoolId, status?, source?, page, limit }` | `{ enquiries: AdmissionEnquiry[], total }` |
| `getPendingDocuments` | Query | `{ schoolId }` | `AdmissionEnquiry[] WHERE documentsPending = true` |
| `updateStatus` | Mutation | `{ id, status }` | `AdmissionEnquiry` |
| `uploadDocuments` | Mutation | `{ id, documents: string[] }` | `AdmissionEnquiry (documentsPending = false)` |
| `collectFee` | Mutation | `{ id, amountPaid, method, discountAmount?, discountReason? }` | `AdmissionEnquiry (feeStatus updated)` |
| `confirmAdmission` | Mutation | `{ id, classId, section, rollNumber, siblingStudentId?, feeAmount, feePaid, feeMethod }` | `{ student: User, parent: User, credentials, feeReceipt? }` |
| `searchSibling` | Query | `{ schoolId, searchTerm }` | `StudentProfile[]` (match by name/parent phone) |
| `unlinkSibling` | Mutation | `{ studentId }` | `{ newParentUser: User, success: boolean }` |
| `generateWelcomeLetter` | Query | `{ admissionId }` | `{ pdfUrl: string }` |
| `bulkImport` | Mutation | `{ csvData: AdmissionRow[] }` | `{ imported: number, siblingsLinked: number, errors: Error[] }` |
| `downloadTemplate` | Query | `{}` | `{ templateUrl: string }` (pre-built Excel template) |
| `getQrCode` | Query | `{ schoolId }` | `{ qrCodeUrl: string, formUrl: string }` |

### 6.11 Router: `library.ts` (Librarian)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `searchBook` | Query | `{ isbn?, title? }` | `Book[]` |
| `issueBook` | Mutation | `{ barcodeId, studentId }` | `BookIssue` |
| `returnBook` | Mutation | `{ barcodeId }` | `{ issue: BookIssue, fine: number }` |
| `collectFine` | Mutation | `{ issueId }` | `BookIssue (finePaid = true)` |
| `addFineToFees` | Mutation | `{ issueId }` | `FeePayment (added to student dues)` |

### 6.12 Router: `inventory.ts` (Store Manager)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `getStock` | Query | `{ category? }` | `InventoryItem[]` |
| `checkout` | Mutation | `{ studentId?, items: {id, qty}[], paymentMode }` | `StoreSale` |
| `getLowStockAlerts` | Query | `{}` | `InventoryItem[]` |

### 6.13 Router: `payroll.ts` (Principal + Accountant)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `runMonthlyPayroll` | Mutation | `{ monthYear }` | `Payslip[]` (bulk calculated) |
| `getPayslip` | Query | `{ id }` | `Payslip (with pdfUrl)` |
| `exportBankFile` | Query | `{ monthYear }` | `{ csvUrl: string }` |

### 6.14 Router: `certificate.ts` (Admin Staff)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `generateTC` | Mutation | `{ studentId }` | `{ pdfUrl, qrHash }` (throws if dues exist) |
| `generateBonafide` | Mutation | `{ studentId }` | `{ pdfUrl, qrHash }` |
| `verifyQr` | Query | `{ qrHash }` | `IssuedCertificate & { isValid: true }` |

### 6.15 Router: `reportCard.ts` (Super Admin + Teacher)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `calculateGrades` | Mutation | `{ classId, term }` | `ReportCard[]` (batch processed) |
| `bulkGeneratePdf` | Mutation | `{ classId, term }` | `{ pdfUrl }` (single merged file) |

### 6.16 Router: `compliance.ts` (Super Admin + Master Admin)
| Procedure | Type | Input | Output |
|---|---|---|---|
| `generateUDISE` | Mutation | `{ academicYear }` | `{ logId: string, downloadUrl: string }` |
| `generateCBSEReport` | Mutation | `{ academicYear }` | `{ logId: string, downloadUrl: string }` |
| `getExportLogs` | Query | `{ page, limit }` | `ComplianceExportLog[]` |

---

## 7. Authentication & RBAC Middleware Implementation

### 7.1 JWT Payload Structure
```typescript
interface ERPJwtPayload {
  sub: string;           // User UUID
  email: string;
  role: Role;            // MASTER_ADMIN | SUPER_ADMIN | TEACHER | ...
  schoolId: string;      // Tenant isolation key
  isActive: boolean;
}
```

### 7.2 Edge Middleware Route Protection
```typescript
// middleware.ts
const routePermissions: Record<string, Role[]> = {
  '/master':     ['MASTER_ADMIN'],
  '/admin':      ['SUPER_ADMIN'],
  '/staff':      ['ADMIN_STAFF'],
  '/teacher':    ['TEACHER'],
  '/student':    ['STUDENT'],
  '/parent':     ['PARENT'],
  '/librarian':  ['LIBRARIAN'],
  '/store':      ['STORE_MANAGER'],
  '/accountant': ['ACCOUNTANT'],
};
```

### 7.3 Multi-Tenant Data Isolation
Every Prisma query MUST include `schoolId` filter:
```typescript
// All queries go through this wrapper
function withTenant<T>(session: Session, query: T): T & { where: { schoolId: string } } {
  return { ...query, where: { ...query.where, schoolId: session.user.schoolId } };
}
```

---

## 8. Offline-First Sync Engine (Technical Specification)

### 8.1 IndexedDB Schema (Dexie.js)
```javascript
const db = new Dexie("ERPSyncDB");
db.version(1).stores({
  syncQueue: "++id, endpoint, status, timestamp"
  // status: PENDING | SYNCED | FAILED
});
```

### 8.2 Sync Algorithm
1. User performs action offline → Mutation saved to `syncQueue` with `status: PENDING`
2. `window.addEventListener('online')` triggers `processQueue()`
3. Queue processor reads all `PENDING` entries, sorted by `timestamp` (oldest first)
4. Sends POST request for each entry to the corresponding tRPC endpoint
5. On success: Update entry to `status: SYNCED`
6. On failure (500): Retry with exponential backoff (2s, 4s, 8s)
7. On auth failure (401): Halt queue, prompt re-login

### 8.3 Conflict Resolution
**Strategy: Last-Write-Wins based on timestamps**
- Attendance is uniquely keyed by `[studentId + date]`
- Backend uses Prisma `upsert` — if record exists, the one with later `syncedAt` timestamp wins
- This prevents duplicate entries and resolves offline vs online conflicts cleanly

---

## 9. AI Engine Architecture (Gemini API)

### 9.1 Centralized Service Layer
All AI calls route through `src/lib/ai/`:
- `timetable-generator.ts` — Constraint satisfaction + Gemini optimization
- `leave-suggester.ts` — Free teacher finder + subject matching
- `notice-writer.ts` — Auto-draft + multi-language translation

### 9.2 Rate Limiting (Upstash Redis)
- Timetable generation: Max 5 requests / school / 24 hours
- Notice drafting: Max 20 requests / school / 24 hours
- Report generation: Max 1 batch / school / week

### 9.3 Prompt Injection Defense
All user inputs are parameterized and enclosed in markdown blocks within the system prompt. The AI never sees raw user input as instruction text.

---

## 10. Razorpay SmartCollect Integration Flow

1. **Student enrolled** → Background job calls Razorpay API → Creates `Customer` + `Virtual Account`
2. **Virtual Account saved** to `StudentProfile.virtualAccountId`
3. **Parent pays** via UPI/NEFT to the virtual account number
4. **Razorpay fires webhook** → `POST /api/webhooks/razorpay`
5. **Webhook handler** verifies `x-razorpay-signature` (crypto hash)
6. **Auto-reconciliation** → Looks up student by `virtualAccountId` → Marks `FeePayment.status = 'PAID'`
7. **SMS dispatched** to parent confirming payment

---

## 11. Testing & Verification Plan (from implementation plan lines 496-508)

### 11.1 Automated Tests
1. Unit tests for API routes — **Jest / Vitest**
2. E2E tests for critical flows — **Playwright**
3. `npm run build` — Compilation check (TypeScript)

### 11.2 Manual Verification
1. Each role login & feature testing (all 7 roles)
2. Payment gateway sandbox testing (Razorpay test mode)
3. AI feature accuracy testing (Gemini output quality)
4. Mobile responsiveness check (all breakpoints)
5. Load testing for concurrent users (k6 / Artillery)
