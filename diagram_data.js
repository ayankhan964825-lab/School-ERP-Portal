/**
 * ERP Portal — EXTREME DEEP System Architecture Data
 * Every technical code-level point from:
 *   - implementation_plan.md (513 lines)
 *   - trd.md (922 lines) 
 *   - prd.md, system_design.md, design.md, phase.md
 * Total Nodes: 650+
 * Roles: Master Admin, Super Admin, Teacher, Student, Parent, Driver, Accountant
 */

const TREE_DATA = {
  name: "ERP PORTAL",
  desc: "Multi-Tenant School ERP SaaS Platform",
  icon: "🌐",
  color: "master",
  children: [
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🛠️ PLATFORM CORE & INFRASTRUCTURE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "PLATFORM CORE",
      desc: "Cloud infrastructure, security, auth & databases",
      icon: "🛠️",
      color: "general",
      children: [
        {
          name: "Tech Stack (14 Technologies)",
          desc: "Implementation Plan Lines 11-28 • TRD Section 1",
          icon: "📦",
          color: "general",
          children: [
            {
              name: "Frontend Layer",
              desc: "Web + Mobile rendering engines",
              icon: "🖥️",
              color: "general",
              children: [
                { name: "Next.js 14+ (App Router)", desc: "Server Components + Edge Runtime. SEO-friendly SSR", icon: "⚛️", color: "general" },
                { name: "React Native (Expo)", desc: "Single codebase for iOS + Android mobile apps", icon: "📱", color: "general" },
                { name: "shadcn/ui + Tailwind CSS", desc: "Premium, accessible UI components. Dynamic theming per tenant", icon: "🎨", color: "general" },
                { name: "react-hook-form + zod", desc: "Type-safe form validation. Client-side + server-side schemas", icon: "📋", color: "general" }
              ]
            },
            {
              name: "Backend Layer",
              desc: "API framework + type-safety",
              icon: "⚙️",
              color: "general",
              children: [
                { name: "tRPC + Next.js API Routes", desc: "End-to-end type-safe API. No manual API client generation", icon: "🔌", color: "general" },
                { name: "Prisma ORM", desc: "Type-safe DB queries. Auto migration. 20+ model schema", icon: "🔷", color: "general" },
                { name: "NextAuth.js v5 (Auth.js)", desc: "JWT strategy. CSRF protection. Custom Credentials Provider", icon: "🔐", color: "general" }
              ]
            },
            {
              name: "Data & Storage Layer",
              desc: "Persistence + caching + file storage",
              icon: "💾",
              color: "general",
              children: [
                { name: "PostgreSQL (Supabase/Neon)", desc: "Relational data. RLS. Connection pooling via DATABASE_URL", icon: "🐘", color: "general" },
                { name: "Upstash Redis", desc: "Session cache + AI rate limiting. REST API based", icon: "⚡", color: "general" },
                { name: "Cloudflare R2", desc: "Zero egress fees. Documents, photos, receipts. Bucket: school-erp-documents", icon: "☁️", color: "general" }
              ]
            },
            {
              name: "External Services",
              desc: "AI, payments, communication, realtime",
              icon: "🌍",
              color: "general",
              children: [
                { name: "Gemini API (AI Engine)", desc: "Timetable generation, narrative reports, notice drafting, at-risk alerts", icon: "🤖", color: "general" },
                { name: "Razorpay (SmartCollect)", desc: "Virtual bank accounts per student. Webhook auto-reconciliation", icon: "💳", color: "general" },
                { name: "MSG91 (DLT SMS)", desc: "TRAI DLT-approved transactional SMS. Sender ID: SCHERP", icon: "💬", color: "general" },
                { name: "Resend (Email)", desc: "Welcome emails, password resets, fee confirmations", icon: "📧", color: "general" },
                { name: "Pusher / Socket.io", desc: "Live notifications, realtime updates, bus GPS tracking", icon: "📡", color: "general" }
              ]
            },
            {
              name: "Deployment",
              desc: "Hosting + CI/CD",
              icon: "🚀",
              color: "general",
              children: [
                { name: "Vercel (Frontend)", desc: "Edge Network. Serverless functions. Auto-deploy on git push", icon: "▲", color: "general" },
                { name: "Railway / Supabase (DB)", desc: "Managed PostgreSQL. Connection pooling. Daily backups", icon: "🛤️", color: "general" }
              ]
            }
          ]
        },
        {
          name: "Authentication & Identity",
          desc: "NextAuth.js v5 • TRD Section 7 • JWT + RBAC",
          icon: "🔐",
          color: "general",
          children: [
            {
              name: "Custom Credentials Provider",
              desc: "Email/password login with bcryptjs (cost factor 12)",
              icon: "🔑",
              color: "general",
              children: [
                { name: "Password Hashing", desc: "bcryptjs with cost factor 12. Stored as password_hash in User table", icon: "🔒", color: "general" },
                { name: "Login Validation", desc: "react-hook-form + zod: email format, password min 8 chars", icon: "✅", color: "general" },
                { name: "Error States", desc: "Invalid credentials, account suspended (isActive=false), school deactivated", icon: "❌", color: "general" }
              ]
            },
            {
              name: "JWT Payload Structure",
              desc: "ERPJwtPayload: { sub, email, role, schoolId, isActive }",
              icon: "📋",
              color: "general",
              children: [
                { name: "sub (User UUID)", desc: "Unique user identifier from User.id", icon: "🆔", color: "general" },
                { name: "role (ENUM)", desc: "MASTER_ADMIN | SUPER_ADMIN | TEACHER | STUDENT | PARENT | DRIVER | ACCOUNTANT", icon: "🛡️", color: "general" },
                { name: "schoolId (Tenant Key)", desc: "Multi-tenant isolation. Every API query filters by this", icon: "🏫", color: "general" },
                { name: "JWT Callbacks", desc: "NextAuth jwt() injects role + schoolId into token on login", icon: "⚙️", color: "general" }
              ]
            },
            {
              name: "Edge Middleware (middleware.ts)",
              desc: "Route protection at Vercel Edge Runtime",
              icon: "🛡️",
              color: "general",
              children: [
                { name: "/master/* → MASTER_ADMIN", desc: "Only platform owner can access master panel", icon: "👑", color: "general" },
                { name: "/admin/* → SUPER_ADMIN", desc: "Only school principal can access admin panel", icon: "🎓", color: "general" },
                { name: "/teacher/* → TEACHER", desc: "Only teachers access teacher panel", icon: "👨‍🏫", color: "general" },
                { name: "/student/* → STUDENT", desc: "Only students access student portal", icon: "👨‍🎓", color: "general" },
                { name: "/parent/* → PARENT", desc: "Only parents access parent portal", icon: "👨‍👩‍👦", color: "general" },
                { name: "/driver/* → DRIVER", desc: "Only drivers access driver panel", icon: "🚌", color: "general" },
                { name: "/accountant/* → ACCOUNTANT", desc: "Only accountants access account office", icon: "💼", color: "general" },
                { name: "Unauthorized → /login or 403", desc: "Redirect to login page or show forbidden error", icon: "🚫", color: "general" },
                { name: "Session Hijacking", desc: "Prevent stolen JWT tokens from being reused across sessions", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Multi-Tenant Data Isolation",
              desc: "withTenant() wrapper on every Prisma query",
              icon: "🧱",
              color: "general",
              children: [
                { name: "withTenant() Function", desc: "Injects schoolId into every Prisma where clause automatically", icon: "🔧", color: "general" },
                { name: "Row-Level Security (RLS)", desc: "PostgreSQL-level enforcement. School A cannot query School B rows", icon: "🔒", color: "general" },
                { name: "Cascade Delete", desc: "Deleting School cascades to all child records (users, classes, fees)", icon: "🗑️", color: "general" },
                { name: "Cross-Tenant Access Attempt", desc: "Security audit: test School B data access with School A token → must fail", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "OAuth Integration",
              desc: "Google/Microsoft login for teachers & students",
              icon: "🌐",
              color: "general",
              children: [
                { name: "Google OAuth", desc: "Teachers and students can login via Google accounts", icon: "🟢", color: "general" },
                { name: "Microsoft OAuth", desc: "Support Microsoft 365 school accounts", icon: "🔵", color: "general" }
              ]
            }
          ]
        },
        {
          name: "Database Architecture (20 Tables)",
          desc: "Prisma Schema • TRD Section 3 • Implementation Plan Lines 63-187",
          icon: "🗄️",
          color: "general",
          children: [
            {
              name: "Section A: Multi-Tenant Foundation (2 Tables)",
              desc: "Implementation Plan Lines 66-76",
              icon: "🏗️",
              color: "general",
              children: [
                {
                  name: "School (Tenant Root)",
                  desc: "model School { id, name, logo, address, contact, subscriptionPlan, settings }",
                  icon: "🏫",
                  color: "general",
                  children: [
                    { name: "id: String @id @default(uuid())", desc: "Primary key, auto-generated UUID", icon: "🆔", color: "general" },
                    { name: "subscriptionPlan: FREE | BASIC | PREMIUM", desc: "SaaS tier. Controls feature access via feature flags", icon: "💎", color: "general" },
                    { name: "settings: Json?", desc: "Grading scale, SMS prefs, theme colors, custom config", icon: "⚙️", color: "general" },
                    { name: "academicYearStart / End", desc: "Academic session boundaries for all child data", icon: "📅", color: "general" }
                  ]
                },
                {
                  name: "User (Auth Entity)",
                  desc: "model User { id, schoolId, email, phone, password_hash, role, isActive }",
                  icon: "👤",
                  color: "general",
                  children: [
                    { name: "role: ENUM(7 roles)", desc: "MASTER_ADMIN | SUPER_ADMIN | TEACHER | STUDENT | PARENT | DRIVER | ACCOUNTANT", icon: "🛡️", color: "general" },
                    { name: "schoolId: FK → School", desc: "Tenant binding. NULL only for MASTER_ADMIN", icon: "🔗", color: "general" },
                    { name: "password_hash: String", desc: "bcryptjs hashed. Never stored in plaintext", icon: "🔒", color: "general" },
                    { name: "isActive: Boolean", desc: "Soft-delete / suspend. Login blocked when false", icon: "✅", color: "general" },
                    { name: "@@unique([email, schoolId])", desc: "Same email allowed across different schools, unique within one", icon: "📧", color: "general" }
                  ]
                }
              ]
            },
            {
              name: "Section B: Academic Module (7 Tables)",
              desc: "Implementation Plan Lines 79-107",
              icon: "📚",
              color: "general",
              children: [
                { name: "Class", desc: "{ id, schoolId, name (e.g. '10th-A'), section, academicYear }", icon: "🏛️", color: "general" },
                { name: "SubjectMaster", desc: "{ id, schoolId, name, code (e.g. 'MATH-101') } — Centralized subject catalog", icon: "📖", color: "general" },
                { name: "Subject", desc: "{ id, subjectMasterId, classId } — Subject assigned to a specific class", icon: "📗", color: "general" },
                { name: "ClassTeacher (Mapping)", desc: "{ teacherId, classId, subjectId, isClassTeacher, assignedBy }", icon: "🔗", color: "general" },
                { name: "TimetablePeriod", desc: "{ classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room, isAiGenerated }", icon: "📅", color: "general" },
                { name: "AcademicSchedule", desc: "{ schoolId, title, date, type: EXAM | HOLIDAY | EVENT, description }", icon: "📆", color: "general" },
                { name: "Syllabus", desc: "{ classId, subjectId, topics: JSON[{topic_name, expected_hours, is_completed}], uploadedBy }", icon: "📝", color: "general" }
              ]
            },
            {
              name: "Section C: Profile Tables (4 Tables)",
              desc: "TeacherProfile, StudentProfile, ParentProfile, DriverProfile",
              icon: "👥",
              color: "general",
              children: [
                { name: "TeacherProfile", desc: "{ userId, qualification, experience, specialization } — 1:1 with User", icon: "👨‍🏫", color: "general" },
                { name: "StudentProfile", desc: "{ userId, classId, rollNumber, parentId, bloodGroup, medicalInfo, virtualAccountId }", icon: "👨‍🎓", color: "general" },
                { name: "ParentProfile", desc: "{ userId, occupation, relation } — Has many StudentProfiles (multiple children)", icon: "👨‍👩‍👦", color: "general" },
                { name: "DriverProfile", desc: "{ userId, licenseNumber, contact, emergencyContact, assignedVehicleId }", icon: "🚌", color: "general" }
              ]
            },
            {
              name: "Section D: Attendance & Results (3 Tables)",
              desc: "Implementation Plan Lines 109-131",
              icon: "📊",
              color: "general",
              children: [
                { name: "Attendance", desc: "{ studentId, classId, date, status: PRESENT|ABSENT|LATE|HALF_DAY, markedBy, syncedAt }", icon: "✅", color: "general" },
                { name: "@@unique([studentId, date])", desc: "One record per student per day — prevents duplicates, enables offline upsert", icon: "🔒", color: "general" },
                { name: "Exam", desc: "{ schoolId, name, classId, subjectId, date, totalMarks, passingMarks, type: UNIT_TEST|MID_TERM|FINAL }", icon: "📝", color: "general" },
                { name: "Result", desc: "{ examId, studentId, marksObtained, grade (auto-calc), remarks, uploadedBy }", icon: "📊", color: "general" },
                { name: "@@unique([examId, studentId])", desc: "One result per student per exam — prevents duplicate uploads", icon: "🔒", color: "general" }
              ]
            },
            {
              name: "Section E-H: Homework, Transport, Fee, Communication (7 Tables)",
              desc: "Homework, Vehicle, Route, FeeStructure, FeePayment, Expense, Notice, LeaveApplication",
              icon: "📦",
              color: "general",
              children: [
                { name: "Homework", desc: "{ classId, subjectId, teacherId, title, description, dueDate, attachments: JSON[] }", icon: "📝", color: "general" },
                { name: "Vehicle", desc: "{ schoolId, busNumber, capacity, isActive }", icon: "🚐", color: "general" },
                { name: "Route", desc: "{ schoolId, name, vehicleId, stops: JSON[{name, lat, lng, time}], driverId }", icon: "🗺️", color: "general" },
                { name: "FeeStructure", desc: "{ schoolId, classId, feeType: TUITION|TRANSPORT|LIBRARY|SPORTS, amount, dueDate, frequency, lateFeePerDay }", icon: "💰", color: "general" },
                { name: "FeePayment", desc: "{ studentId, feeStructureId, amountPaid, paymentMethod, transactionId, receiptNumber, status, onlineReceiptUrl }", icon: "💳", color: "general" },
                { name: "Expense", desc: "{ schoolId, category, amount, description, date, approvedBy, receiptAttachment }", icon: "💸", color: "general" },
                { name: "Notice", desc: "{ schoolId, title, content, targetRoles: JSON[], targetClasses: JSON[], isPublished, publishDate, attachments }", icon: "📢", color: "general" },
                { name: "LeaveApplication", desc: "{ userId, leaveType: SICK|CASUAL|PERSONAL, role, fromDate, toDate, reason, status, aiSubstituteSuggestion: JSON }", icon: "🏖️", color: "general" }
              ]
            }
          ]
        },
        {
          name: "tRPC API Layer (9 Routers)",
          desc: "TRD Section 6 • src/server/routers/*.ts",
          icon: "🔌",
          color: "general",
          children: [
            {
              name: "school.ts (Master Admin Only)",
              desc: "School CRUD operations",
              icon: "🏫",
              color: "general",
              children: [
                { name: "school.create", desc: "Mutation: { name, address, contact, subscriptionPlan } → School", icon: "➕", color: "general" },
                { name: "school.getAll", desc: "Query: { page, limit, search? } → { schools[], total }", icon: "📋", color: "general" },
                { name: "school.getById", desc: "Query: { id } → School with full details", icon: "🔍", color: "general" },
                { name: "school.update", desc: "Mutation: { id, name?, logo?, settings? } → School", icon: "✏️", color: "general" },
                { name: "school.suspend", desc: "Mutation: { id } → { success: boolean }", icon: "⛔", color: "general" }
              ]
            },
            {
              name: "user.ts (Super Admin + Master Admin)",
              desc: "User management across roles",
              icon: "👤",
              color: "general",
              children: [
                { name: "user.create", desc: "Mutation: { email, phone, role, schoolId, classId? } → User", icon: "➕", color: "general" },
                { name: "user.getBySchool", desc: "Query: { schoolId, role?, page, limit } → { users[], total }", icon: "📋", color: "general" },
                { name: "user.update", desc: "Mutation: { id, phone?, isActive? } → User", icon: "✏️", color: "general" },
                { name: "user.deactivate", desc: "Mutation: { id } → { success } — Soft delete", icon: "🚫", color: "general" },
                { name: "user.bulkImport", desc: "Mutation: { csvData: StudentRow[] } → { imported, errors[] }", icon: "📤", color: "general" }
              ]
            },
            {
              name: "class.ts",
              desc: "Class CRUD + teacher assignment",
              icon: "🏛️",
              color: "general",
              children: [
                { name: "class.create", desc: "Mutation: { name, section, academicYear } → Class", icon: "➕", color: "general" },
                { name: "class.getAll", desc: "Query: { schoolId } → Class[]", icon: "📋", color: "general" },
                { name: "class.assignTeacher", desc: "Mutation: { teacherId, classId, subjectId, isClassTeacher } → ClassTeacher", icon: "🔗", color: "general" }
              ]
            },
            {
              name: "attendance.ts",
              desc: "Attendance marking + offline sync",
              icon: "✅",
              color: "general",
              children: [
                { name: "attendance.markBulk", desc: "Mutation: { classId, date, records: [{studentId, status, timestamp}] } → { syncedCount, conflicts }", icon: "📋", color: "general" },
                { name: "attendance.getForClassDate", desc: "Query: { classId, date } → Attendance[]", icon: "📅", color: "general" },
                { name: "attendance.getStudentStats", desc: "Query: { studentId, month, year } → { present, absent, late, percentage }", icon: "📊", color: "general" },
                { name: "attendance.getStudentCalendar", desc: "Query: { studentId, month, year } → AttendanceCalendarDay[]", icon: "📆", color: "general" }
              ]
            },
            {
              name: "result.ts",
              desc: "Exam + marks + AI reports",
              icon: "📊",
              color: "general",
              children: [
                { name: "result.createExam", desc: "Mutation: { name, classId, subjectId, date, totalMarks, passingMarks, type } → Exam", icon: "➕", color: "general" },
                { name: "result.uploadMarks", desc: "Mutation: { examId, marks: [{studentId, marksObtained, remarks?}] } → { uploaded }", icon: "📤", color: "general" },
                { name: "result.getStudentResults", desc: "Query: { studentId } → ResultWithExam[]", icon: "📋", color: "general" },
                { name: "result.generateAiReport", desc: "Mutation: { studentId } → { narrative: string } — Gemini behavioral narrative", icon: "🤖", color: "general" }
              ]
            },
            {
              name: "fee.ts",
              desc: "Fee structures + Razorpay payments",
              icon: "💰",
              color: "general",
              children: [
                { name: "fee.createStructure", desc: "Mutation: { classId, feeType, amount, dueDate, frequency, lateFee } → FeeStructure", icon: "➕", color: "general" },
                { name: "fee.getStudentDues", desc: "Query: { studentId } → FeePayment[] with breakdowns", icon: "📋", color: "general" },
                { name: "fee.initiatePayment", desc: "Mutation: { paymentIds[] } → { razorpayOrderId, amount, key }", icon: "💳", color: "general" },
                { name: "fee.recordOffline", desc: "Mutation: { studentId, feeStructureId, amount, method } → FeePayment", icon: "💵", color: "general" },
                { name: "fee.downloadReceipt", desc: "Query: { paymentId } → { url: string } — R2 signed URL", icon: "📥", color: "general" }
              ]
            },
            {
              name: "transport.ts",
              desc: "Vehicles + routes + driver assignment",
              icon: "🚌",
              color: "general",
              children: [
                { name: "transport.createVehicle", desc: "Mutation: { busNumber, capacity } → Vehicle", icon: "➕", color: "general" },
                { name: "transport.createRoute", desc: "Mutation: { name, vehicleId, stops: JSON, driverId } → Route", icon: "🗺️", color: "general" },
                { name: "transport.getStudentRoute", desc: "Query: { studentId } → RouteWithVehicleAndDriver", icon: "📋", color: "general" },
                { name: "transport.getDriverRoute", desc: "Query: { driverId } → RouteWithStops", icon: "🧑‍✈️", color: "general" }
              ]
            },
            {
              name: "notice.ts",
              desc: "Notice CRUD + AI drafting",
              icon: "📢",
              color: "general",
              children: [
                { name: "notice.create", desc: "Mutation: { title, content, targetRoles?, targetClasses?, publishDate? } → Notice", icon: "➕", color: "general" },
                { name: "notice.getForUser", desc: "Query: { userId, role, classId? } → Notice[] — Filtered by role/class targeting", icon: "📋", color: "general" },
                { name: "notice.aiDraft", desc: "Mutation: { topic } → { titleEn, contentEn, contentHi } — Gemini auto-draft + translate", icon: "🤖", color: "general" }
              ]
            },
            {
              name: "leave.ts",
              desc: "Leave applications + AI substitute",
              icon: "🏖️",
              color: "general",
              children: [
                { name: "leave.apply", desc: "Mutation: { leaveType, fromDate, toDate, reason } → LeaveApplication", icon: "📝", color: "general" },
                { name: "leave.approve", desc: "Mutation: { id } → LeaveApplication", icon: "✅", color: "general" },
                { name: "leave.reject", desc: "Mutation: { id, reason } → LeaveApplication", icon: "❌", color: "general" },
                { name: "leave.getSubstituteSuggestion", desc: "Query: { teacherId, date } → { suggestions: TeacherSuggestion[] }", icon: "🤖", color: "general" }
              ]
            }
          ]
        },
        {
          name: "AI Engine Architecture",
          desc: "TRD Section 9 • src/lib/ai/*.ts • Gemini API",
          icon: "🤖",
          color: "general",
          children: [
            {
              name: "timetable-generator.ts",
              desc: "Constraint satisfaction + Gemini optimization",
              icon: "📅",
              color: "general",
              children: [
                { name: "Input Constraints", desc: "Teacher availability, room limits, subject hours per week, preferred slots", icon: "📝", color: "general" },
                { name: "Constraint Satisfaction Algorithm", desc: "Local solver resolves hard constraints (no teacher conflicts)", icon: "🧮", color: "general" },
                { name: "Gemini Optimization", desc: "AI polishes schedule for soft constraints (balanced workload, teacher prefs)", icon: "🤖", color: "general" },
                { name: "isAiGenerated Flag", desc: "TimetablePeriod.isAiGenerated = true for AI-created slots", icon: "🏷️", color: "general" },
                { name: "Rate Limit: 5 req / school / 24h", desc: "Upstash Redis rate limiting to prevent API abuse", icon: "⏱️", color: "general" }
              ]
            },
            {
              name: "leave-suggester.ts",
              desc: "Free teacher finder + subject matching + ranking",
              icon: "🔄",
              color: "general",
              children: [
                { name: "Query Free Periods", desc: "Find all teachers without assigned periods on leave dates", icon: "🔍", color: "general" },
                { name: "Same Subject Preference", desc: "Rank teachers who teach the same subject higher", icon: "⭐", color: "general" },
                { name: "Workload Balancing", desc: "Prefer teachers with fewer substitution assignments this month", icon: "⚖️", color: "general" },
                { name: "AI Ranking", desc: "Gemini ranks suggestions by suitability score", icon: "🤖", color: "general" }
              ]
            },
            {
              name: "notice-writer.ts",
              desc: "Auto-draft + multi-language translation",
              icon: "✍️",
              color: "general",
              children: [
                { name: "Topic → Full Notice", desc: "Admin gives topic, AI generates title + body", icon: "📝", color: "general" },
                { name: "Hindi/Regional Translation", desc: "Auto-translate English notice to Hindi/regional languages", icon: "🌐", color: "general" },
                { name: "Rate Limit: 20 req / school / 24h", desc: "Redis rate limiting for notice generation", icon: "⏱️", color: "general" }
              ]
            },
            {
              name: "Behavioral Narrative Generator",
              desc: "AI-powered report card personality assessments",
              icon: "🧠",
              color: "general",
              children: [
                { name: "Collect Tags", desc: "Aggregate all teacher-assigned behavioral tags for a student over the year", icon: "🏷️", color: "general" },
                { name: "Analyze + Generate", desc: "Gemini analyzes tags + marks → 2-3 paragraph professional narrative", icon: "🤖", color: "general" },
                { name: "Store in Result", desc: "Narrative stored in Result table alongside marks", icon: "💾", color: "general" },
                { name: "Rate Limit: 1 batch / school / week", desc: "Redis rate limiting for bulk report generation", icon: "⏱️", color: "general" }
              ]
            },
            {
              name: "At-Risk Early Warning (Cron)",
              desc: "Background weekly analysis for student risk detection",
              icon: "🚨",
              color: "general",
              children: [
                { name: "Attendance Drop Monitor", desc: "Flag students with >20% attendance drop vs previous month", icon: "📉", color: "general" },
                { name: "Performance Decline", desc: "Alert when marks drop >15% across consecutive exams", icon: "⬇️", color: "general" },
                { name: "Homework Non-Submission", desc: "Track students missing >50% of homework submissions", icon: "📝", color: "general" },
                { name: "Alert → Principal/Counselor", desc: "Push notification + dashboard alert with recommended intervention", icon: "🔔", color: "general" }
              ]
            },
            {
              name: "Prompt Injection Defense",
              desc: "TRD Section 9.3 — Security against AI manipulation",
              icon: "🛡️",
              color: "general",
              children: [
                { name: "Parameterized Inputs", desc: "User inputs enclosed in markdown blocks, never raw instruction text", icon: "🔒", color: "general" },
                { name: "System Prompt Isolation", desc: "AI system prompt clearly separates instructions from user data", icon: "📋", color: "general" }
              ]
            }
          ]
        },
        {
          name: "Offline-First Sync Engine",
          desc: "TRD Section 8 • Dexie.js (IndexedDB) + syncQueue",
          icon: "📴",
          color: "general",
          children: [
            {
              name: "IndexedDB Schema (Dexie.js)",
              desc: "const db = new Dexie('ERPSyncDB')",
              icon: "💾",
              color: "general",
              children: [
                { name: "syncQueue Store", desc: "{ ++id, endpoint, status: PENDING|SYNCED|FAILED, timestamp }", icon: "📋", color: "general" },
                { name: "Local Data Cache", desc: "Cache class lists, student data for offline marking", icon: "📦", color: "general" }
              ]
            },
            {
              name: "Sync Algorithm (6 Steps)",
              desc: "Offline → Queue → Online → Process → Confirm",
              icon: "🔄",
              color: "general",
              children: [
                { name: "Step 1: Offline Action", desc: "User performs mutation → saved to syncQueue with status: PENDING", icon: "1️⃣", color: "general" },
                { name: "Step 2: Online Detection", desc: "window.addEventListener('online') triggers processQueue()", icon: "2️⃣", color: "general" },
                { name: "Step 3: Process Queue", desc: "Read all PENDING entries sorted by timestamp (oldest first)", icon: "3️⃣", color: "general" },
                { name: "Step 4: Send to Server", desc: "POST request for each entry to corresponding tRPC endpoint", icon: "4️⃣", color: "general" },
                { name: "Step 5: Mark SYNCED", desc: "On success: update entry status to SYNCED", icon: "5️⃣", color: "general" },
                { name: "Step 6: Retry Logic", desc: "On 500: exponential backoff (2s, 4s, 8s). On 401: halt, prompt re-login", icon: "6️⃣", color: "general" }
              ]
            },
            {
              name: "Conflict Resolution",
              desc: "Last-Write-Wins based on syncedAt timestamps",
              icon: "⚔️",
              color: "general",
              children: [
                { name: "Unique Key: [studentId + date]", desc: "Attendance keyed by student+date. Prisma upsert handles conflicts", icon: "🔑", color: "general" },
                { name: "Later syncedAt Wins", desc: "If two records exist, the one with later timestamp overwrites", icon: "⏰", color: "general" },
                { name: "Zero Duplicate Guarantee", desc: "@@unique constraint prevents double-marking", icon: "🔒", color: "general" }
              ]
            }
          ]
        },
        {
          name: "Razorpay SmartCollect Integration",
          desc: "TRD Section 10 • Auto Fee Reconciliation Flow",
          icon: "💳",
          color: "general",
          children: [
            { name: "Step 1: Student Enrolled", desc: "Background job → Razorpay API → Create Customer + Virtual Account", icon: "1️⃣", color: "general" },
            { name: "Step 2: Virtual Account Saved", desc: "StudentProfile.virtualAccountId stores unique bank account / UPI ID", icon: "2️⃣", color: "general" },
            { name: "Step 3: Parent Pays", desc: "UPI/NEFT payment to student's virtual account number", icon: "3️⃣", color: "general" },
            { name: "Step 4: Webhook Fires", desc: "Razorpay POSTs to /api/webhooks/razorpay/route.ts", icon: "4️⃣", color: "general" },
            { name: "Step 5: Signature Verify", desc: "Verify x-razorpay-signature with crypto hash (RAZORPAY_WEBHOOK_SECRET)", icon: "5️⃣", color: "general" },
            { name: "Step 6: Auto-Reconcile", desc: "Lookup student by virtualAccountId → FeePayment.status = 'PAID'", icon: "6️⃣", color: "general" },
            { name: "Step 7: SMS Confirm", desc: "MSG91 sends payment confirmation SMS to parent", icon: "7️⃣", color: "general" },
            { name: "Wrong Virtual Account Payment", desc: "Payment to incorrect student's account → manual resolution needed", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Environment Variables (.env)",
          desc: "TRD Section 4 • 9 Configuration Categories",
          icon: "🔧",
          color: "general",
          children: [
            { name: "NEXT_PUBLIC_APP_URL", desc: "https://erp.schoolapp.com — Public app URL", icon: "🌐", color: "general" },
            { name: "DATABASE_URL + DIRECT_URL", desc: "Neon Serverless Postgres connection strings with sslmode=require", icon: "🐘", color: "general" },
            { name: "AUTH_SECRET + AUTH_URL", desc: "NextAuth 32-byte crypto random string + auth endpoint URL", icon: "🔐", color: "general" },
            { name: "UPSTASH_REDIS_REST_URL + TOKEN", desc: "Upstash Redis for AI rate limiting + session caching", icon: "⚡", color: "general" },
            { name: "R2 Keys (4 vars)", desc: "ACCESS_KEY, SECRET, BUCKET_NAME, ACCOUNT_ID for Cloudflare R2", icon: "☁️", color: "general" },
            { name: "GEMINI_API_KEY", desc: "Google Gemini API key for all AI features", icon: "🤖", color: "general" },
            { name: "Razorpay (3 vars)", desc: "KEY_ID, KEY_SECRET, WEBHOOK_SECRET for payment processing", icon: "💳", color: "general" },
            { name: "MSG91_AUTH_KEY + SENDER_ID", desc: "SCHERP sender ID for DLT-approved transactional SMS", icon: "💬", color: "general" },
            { name: "Pusher (4 vars)", desc: "APP_ID, KEY, SECRET, CLUSTER for realtime notifications", icon: "📡", color: "general" }
          ]
        },
        {
          name: "Project Folder Structure",
          desc: "TRD Section 5 • Implementation Plan Lines 300-359",
          icon: "📁",
          color: "general",
          children: [
            { name: "prisma/schema.prisma", desc: "Complete 20-table database schema with all relations", icon: "🔷", color: "general" },
            { name: "src/app/(auth)/", desc: "login/ and register/ — Public authentication pages", icon: "🔐", color: "general" },
            { name: "src/app/(dashboard)/", desc: "7 role panels: master/, admin/, teacher/, student/, parent/, driver/, accountant/", icon: "📊", color: "general" },
            { name: "src/app/api/trpc/[trpc]/route.ts", desc: "tRPC HTTP handler endpoint", icon: "🔌", color: "general" },
            { name: "src/app/api/webhooks/razorpay/route.ts", desc: "SmartCollect webhook receiver for payment auto-reconciliation", icon: "💳", color: "general" },
            { name: "src/components/{ui,dashboard,forms,tables,charts}/", desc: "shadcn/ui primitives + dashboard widgets + zod forms + data tables + charts", icon: "🧩", color: "general" },
            { name: "src/lib/auth.ts", desc: "NextAuth configuration with Credentials Provider + JWT callbacks", icon: "🔐", color: "general" },
            { name: "src/lib/db.ts", desc: "Prisma client singleton (prevent hot-reload connection leak)", icon: "🐘", color: "general" },
            { name: "src/lib/ai/*.ts", desc: "timetable-generator, leave-suggester, notice-writer AI services", icon: "🤖", color: "general" },
            { name: "src/lib/payment/*.ts", desc: "razorpay.ts (SDK init) + smartcollect.ts (virtual account mgmt)", icon: "💳", color: "general" },
            { name: "src/server/routers/*.ts", desc: "9 domain tRPC routers: school, user, class, attendance, result, fee, transport, notice, leave", icon: "⚙️", color: "general" }
          ]
        },
        {
          name: "SaaS & Multi-Tenant Engine",
          desc: "White-labeling, feature flags, dynamic UI",
          icon: "🏗️",
          color: "general",
          children: [
            { name: "Dynamic Theming", desc: "Custom colors & logos per school. CSS variables from School.settings JSON", icon: "🎨", color: "general" },
            { name: "Custom Domain Mapping", desc: "e.g., erp.schoolname.com via CNAME → Vercel", icon: "🌐", color: "general" },
            { name: "Feature Toggles", desc: "AI features = PREMIUM only. Transport module = BASIC+. Feature flags per plan", icon: "🎛️", color: "general" },
            { name: "Subscription Plans", desc: "FREE (basic), BASIC (standard), PREMIUM (all AI + analytics)", icon: "💎", color: "general" },
            { name: "Theme Conflict", desc: "Ensure accessibility with bad custom colors (contrast ratio checks)", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Data Privacy & Security",
          desc: "PII protection, encryption, rate limiting",
          icon: "🛡️",
          color: "general",
          children: [
            { name: "End-to-End Encryption", desc: "Encrypting sensitive fields (passwords, medical info) at rest", icon: "🔒", color: "general" },
            { name: "PII Masking", desc: "Phone/email masked for unauthorized roles (e.g., student sees teacher as XXX-XXX-1234)", icon: "🕵️", color: "general" },
            { name: "Rate Limiting", desc: "API-level rate limiting via Upstash Redis middleware", icon: "⏱️", color: "general" },
            { name: "Automated Backups", desc: "Daily PostgreSQL snapshots + point-in-time recovery", icon: "💾", color: "general" },
            { name: "Data Breach Prevention", desc: "Abnormal activity detection, IP blocking, failed login throttling", icon: "⚠️", color: "edge", edge: true }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔌 API LAYER (1 Unified Layer)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "API LAYER (1 Unified)",
      desc: "tRPC + Next.js API Routes • 9 Domain Routers + 1 Webhook Endpoint",
      icon: "🔌",
      color: "general",
      children: [
        {
          name: "tRPC Router Layer",
          desc: "src/server/routers/*.ts • End-to-end type-safe API",
          icon: "⚡",
          color: "general",
          children: [
            {
              name: "school.ts (Master Admin Only)",
              desc: "School CRUD operations for multi-tenant management",
              icon: "🏫",
              color: "master",
              children: [
                { name: "school.create", desc: "Mutation: { name, address, contact, subscriptionPlan } → School row with UUID", icon: "➕", color: "master" },
                { name: "school.getAll", desc: "Query: { page, limit, search? } → { schools[], total } — Paginated list", icon: "📋", color: "master" },
                { name: "school.getById", desc: "Query: { id } → Full school details with settings JSON", icon: "🔍", color: "master" },
                { name: "school.update", desc: "Mutation: { id, name?, logo?, settings? } → Updated School", icon: "✏️", color: "master" },
                { name: "school.suspend", desc: "Mutation: { id } → { success: boolean } — Blocks all school users", icon: "⛔", color: "master" }
              ]
            },
            {
              name: "user.ts (Super Admin + Master Admin)",
              desc: "User management across all 7 roles",
              icon: "👤",
              color: "super_admin",
              children: [
                { name: "user.create", desc: "Mutation: { email, phone, role, schoolId, classId? } → User + Profile row", icon: "➕", color: "super_admin" },
                { name: "user.getBySchool", desc: "Query: { schoolId, role?, page, limit } → { users[], total }", icon: "📋", color: "super_admin" },
                { name: "user.update", desc: "Mutation: { id, phone?, isActive? } → Updated User", icon: "✏️", color: "super_admin" },
                { name: "user.deactivate", desc: "Mutation: { id } → Soft delete (isActive=false, login blocked)", icon: "🚫", color: "super_admin" },
                { name: "user.bulkImport", desc: "Mutation: { csvData: StudentRow[] } → { imported: number, errors: Error[] }", icon: "📤", color: "super_admin" }
              ]
            },
            {
              name: "class.ts",
              desc: "Class CRUD + Teacher-Subject-Class mapping",
              icon: "🏛️",
              color: "super_admin",
              children: [
                { name: "class.create", desc: "Mutation: { name, section, academicYear } → Class row", icon: "➕", color: "super_admin" },
                { name: "class.getAll", desc: "Query: { schoolId } → Class[] with student counts", icon: "📋", color: "super_admin" },
                { name: "class.assignTeacher", desc: "Mutation: { teacherId, classId, subjectId, isClassTeacher } → ClassTeacher mapping", icon: "🔗", color: "super_admin" }
              ]
            },
            {
              name: "attendance.ts",
              desc: "Attendance marking + offline sync support",
              icon: "✅",
              color: "teacher",
              children: [
                { name: "attendance.markBulk", desc: "Mutation: { classId, date, records: [{studentId, status, timestamp}] } → { syncedCount, conflicts }", icon: "📋", color: "teacher" },
                { name: "attendance.getForClassDate", desc: "Query: { classId, date } → Attendance[] for all students", icon: "📅", color: "teacher" },
                { name: "attendance.getStudentStats", desc: "Query: { studentId, month, year } → { present, absent, late, percentage }", icon: "📊", color: "teacher" },
                { name: "attendance.getStudentCalendar", desc: "Query: { studentId, month, year } → AttendanceCalendarDay[] for calendar UI", icon: "📆", color: "teacher" },
                { name: "Offline Conflict: Prisma upsert", desc: "@@unique([studentId, date]) + syncedAt timestamp → Last-write-wins resolution", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "result.ts",
              desc: "Exam CRUD + Marks upload + AI narrative reports",
              icon: "📊",
              color: "teacher",
              children: [
                { name: "result.createExam", desc: "Mutation: { name, classId, subjectId, date, totalMarks, passingMarks, type } → Exam row", icon: "➕", color: "teacher" },
                { name: "result.uploadMarks", desc: "Mutation: { examId, marks: [{studentId, marksObtained, remarks?}] } → { uploaded }", icon: "📤", color: "teacher" },
                { name: "result.getStudentResults", desc: "Query: { studentId } → ResultWithExam[] (all exams with marks)", icon: "📋", color: "teacher" },
                { name: "result.generateAiReport", desc: "Mutation: { studentId } → { narrative: string } — Gemini behavioral narrative", icon: "🤖", color: "teacher" },
                { name: "Marks > Total Marks", desc: "Zod validation: marksObtained must be ≤ Exam.totalMarks", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "fee.ts",
              desc: "Fee structures + Razorpay payments + receipt download",
              icon: "💰",
              color: "accountant",
              children: [
                { name: "fee.createStructure", desc: "Mutation: { classId, feeType, amount, dueDate, frequency, lateFee } → FeeStructure", icon: "➕", color: "accountant" },
                { name: "fee.getStudentDues", desc: "Query: { studentId } → FeePayment[] with detailed breakdowns", icon: "📋", color: "accountant" },
                { name: "fee.initiatePayment", desc: "Mutation: { paymentIds[] } → { razorpayOrderId, amount, key } for checkout", icon: "💳", color: "accountant" },
                { name: "fee.recordOffline", desc: "Mutation: { studentId, feeStructureId, amount, method } → FeePayment + receipt", icon: "💵", color: "accountant" },
                { name: "fee.downloadReceipt", desc: "Query: { paymentId } → { url: string } — R2 signed URL for PDF download", icon: "📥", color: "accountant" }
              ]
            },
            {
              name: "transport.ts",
              desc: "Vehicles + Routes + Driver assignment",
              icon: "🚌",
              color: "driver",
              children: [
                { name: "transport.createVehicle", desc: "Mutation: { busNumber, capacity } → Vehicle row", icon: "➕", color: "driver" },
                { name: "transport.createRoute", desc: "Mutation: { name, vehicleId, stops: JSON, driverId } → Route row", icon: "🗺️", color: "driver" },
                { name: "transport.getStudentRoute", desc: "Query: { studentId } → RouteWithVehicleAndDriver (full transport info)", icon: "📋", color: "driver" },
                { name: "transport.getDriverRoute", desc: "Query: { driverId } → RouteWithStops (driver's assigned route)", icon: "🧑‍✈️", color: "driver" }
              ]
            },
            {
              name: "notice.ts",
              desc: "Notice CRUD + AI auto-drafting + multi-language",
              icon: "📢",
              color: "super_admin",
              children: [
                { name: "notice.create", desc: "Mutation: { title, content, targetRoles?, targetClasses?, publishDate? } → Notice", icon: "➕", color: "super_admin" },
                { name: "notice.getForUser", desc: "Query: { userId, role, classId? } → Notice[] filtered by role/class targeting", icon: "📋", color: "super_admin" },
                { name: "notice.aiDraft", desc: "Mutation: { topic } → { titleEn, contentEn, contentHi } — Gemini auto-draft + translate", icon: "🤖", color: "super_admin" }
              ]
            },
            {
              name: "leave.ts",
              desc: "Leave applications + AI substitute suggestion",
              icon: "🏖️",
              color: "teacher",
              children: [
                { name: "leave.apply", desc: "Mutation: { leaveType, fromDate, toDate, reason } → LeaveApplication (status: PENDING)", icon: "📝", color: "teacher" },
                { name: "leave.approve", desc: "Mutation: { id } → LeaveApplication (status: APPROVED)", icon: "✅", color: "teacher" },
                { name: "leave.reject", desc: "Mutation: { id, reason } → LeaveApplication (status: REJECTED)", icon: "❌", color: "teacher" },
                { name: "leave.getSubstituteSuggestion", desc: "Query: { teacherId, date } → { suggestions: TeacherSuggestion[] } — AI ranked", icon: "🤖", color: "teacher" }
              ]
            }
          ]
        },
        {
          name: "Webhook Endpoints",
          desc: "src/app/api/webhooks/ • External service callbacks",
          icon: "🪝",
          color: "general",
          children: [
            {
              name: "Razorpay SmartCollect Webhook",
              desc: "POST /api/webhooks/razorpay/route.ts",
              icon: "💳",
              color: "general",
              children: [
                { name: "Webhook Receiver", desc: "Razorpay POSTs payment event to /api/webhooks/razorpay", icon: "📥", color: "general" },
                { name: "Signature Verification", desc: "Verify x-razorpay-signature header with HMAC SHA256 using RAZORPAY_WEBHOOK_SECRET", icon: "🔐", color: "general" },
                { name: "Auto-Reconciliation", desc: "Lookup student by virtualAccountId → Update FeePayment.status = 'PAID'", icon: "✅", color: "general" },
                { name: "SMS Trigger", desc: "On success → MSG91 sends payment confirmation SMS to parent", icon: "💬", color: "general" },
                { name: "Invalid Signature", desc: "Return 401 Unauthorized. Log attempt for security audit", icon: "⚠️", color: "edge", edge: true },
                { name: "Duplicate Webhook", desc: "Idempotency check: skip if transactionId already processed", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "tRPC Configuration",
          desc: "src/server/trpc.ts • Router initialization + context",
          icon: "⚙️",
          color: "general",
          children: [
            { name: "createTRPCContext()", desc: "Extract session from NextAuth → Inject into every procedure", icon: "🔧", color: "general" },
            { name: "publicProcedure", desc: "No auth required. Used for health checks, public data", icon: "🌐", color: "general" },
            { name: "protectedProcedure", desc: "Requires valid JWT session. Enforced via middleware chain", icon: "🔒", color: "general" },
            { name: "adminProcedure", desc: "Requires role = SUPER_ADMIN or MASTER_ADMIN", icon: "👑", color: "general" },
            { name: "masterProcedure", desc: "Requires role = MASTER_ADMIN only", icon: "🛡️", color: "general" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🛡️ MIDDLEWARE LAYER (3 Middlewares)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "MIDDLEWARE LAYER (3 Middlewares)",
      desc: "Auth → Tenant Isolation → Rate Limiting • Every request passes through all 3",
      icon: "🛡️",
      color: "general",
      children: [
        {
          name: "MW-1: Edge Route Protection",
          desc: "middleware.ts • Vercel Edge Runtime • First layer of defense",
          icon: "🔐",
          color: "general",
          children: [
            {
              name: "JWT Token Validation",
              desc: "Extract & verify JWT from request cookies/headers",
              icon: "🔑",
              color: "general",
              children: [
                { name: "Token Present Check", desc: "If no JWT token → Redirect to /login immediately", icon: "❌", color: "general" },
                { name: "Token Expiry Check", desc: "If JWT expired → Clear session, redirect to /login", icon: "⏰", color: "general" },
                { name: "Token Decode", desc: "Extract ERPJwtPayload: { sub, email, role, schoolId, isActive }", icon: "📋", color: "general" },
                { name: "isActive Check", desc: "If user.isActive = false → Return 403 Forbidden (suspended account)", icon: "🚫", color: "general" }
              ]
            },
            {
              name: "Route-Role Mapping Enforcement",
              desc: "routePermissions: Record<string, Role[]>",
              icon: "🗺️",
              color: "general",
              children: [
                { name: "/master/* → [MASTER_ADMIN]", desc: "Only platform owner can access master panel routes", icon: "👑", color: "master" },
                { name: "/admin/* → [SUPER_ADMIN]", desc: "Only school principal can access admin panel routes", icon: "🎓", color: "super_admin" },
                { name: "/teacher/* → [TEACHER]", desc: "Only teachers can access teacher panel routes", icon: "👨‍🏫", color: "teacher" },
                { name: "/student/* → [STUDENT]", desc: "Only students can access student portal routes", icon: "👨‍🎓", color: "student" },
                { name: "/parent/* → [PARENT]", desc: "Only parents can access parent portal routes", icon: "👨‍👩‍👦", color: "parent" },
                { name: "/driver/* → [DRIVER]", desc: "Only drivers can access driver panel routes", icon: "🚌", color: "driver" },
                { name: "/accountant/* → [ACCOUNTANT]", desc: "Only accountants can access account office routes", icon: "💼", color: "accountant" },
                { name: "Role Mismatch → 403 or /login", desc: "If user role doesn't match route requirement → Forbidden page", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Public Routes (No Auth)",
              desc: "Routes that bypass authentication",
              icon: "🌐",
              color: "general",
              children: [
                { name: "/login", desc: "Login page — always accessible", icon: "🔑", color: "general" },
                { name: "/register", desc: "Registration page — always accessible", icon: "📝", color: "general" },
                { name: "/api/webhooks/*", desc: "Webhook endpoints use their own signature verification", icon: "🪝", color: "general" },
                { name: "/ (Landing Page)", desc: "Marketing landing page — public", icon: "🏠", color: "general" }
              ]
            }
          ]
        },
        {
          name: "MW-2: Multi-Tenant Data Isolation",
          desc: "withTenant() wrapper • src/lib/db.ts • Prisma query filter",
          icon: "🧱",
          color: "general",
          children: [
            {
              name: "withTenant() Function",
              desc: "Automatically injects schoolId into every Prisma WHERE clause",
              icon: "🔧",
              color: "general",
              children: [
                { name: "Session → schoolId Extraction", desc: "session.user.schoolId from JWT payload → injected into query", icon: "🔑", color: "general" },
                { name: "Prisma WHERE Injection", desc: "{ ...query, where: { ...query.where, schoolId: session.user.schoolId } }", icon: "🔷", color: "general" },
                { name: "Every Query Wrapped", desc: "ALL tRPC procedures use withTenant() — no exceptions", icon: "✅", color: "general" },
                { name: "MASTER_ADMIN Exception", desc: "Master Admin can query across schools (no schoolId filter)", icon: "👑", color: "general" }
              ]
            },
            {
              name: "PostgreSQL Row-Level Security (RLS)",
              desc: "Database-level enforcement as second safety net",
              icon: "🐘",
              color: "general",
              children: [
                { name: "RLS Policies per Table", desc: "Every table with schoolId has RLS policy: SELECT WHERE schoolId = current_tenant", icon: "🔒", color: "general" },
                { name: "Defense in Depth", desc: "Even if withTenant() bypassed, RLS prevents cross-tenant data leaks", icon: "🛡️", color: "general" }
              ]
            },
            {
              name: "Cascade Delete Isolation",
              desc: "Deleting school removes ALL child data",
              icon: "🗑️",
              color: "general",
              children: [
                { name: "onDelete: Cascade", desc: "School deletion cascades to Users, Classes, Fees, Attendance, etc.", icon: "⬇️", color: "general" },
                { name: "No Orphan Records", desc: "Prisma relation constraints prevent orphaned data after tenant removal", icon: "✅", color: "general" }
              ]
            },
            {
              name: "Cross-Tenant Access Attempt",
              desc: "Security audit test: School B data with School A token → MUST fail",
              icon: "⚠️",
              color: "edge",
              edge: true,
              children: [
                { name: "Automated Security Test", desc: "Playwright E2E: Login as School A admin → Try fetching School B student → Assert 403", icon: "🧪", color: "edge", edge: true },
                { name: "Audit Log", desc: "Log any cross-tenant query attempts for security review", icon: "📋", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "MW-3: AI Rate Limiter",
          desc: "Upstash Redis • Per-school per-endpoint rate limiting",
          icon: "⏱️",
          color: "general",
          children: [
            {
              name: "Rate Limit Rules",
              desc: "Different limits for different AI endpoints",
              icon: "📋",
              color: "general",
              children: [
                { name: "Timetable Generation: 5 req / school / 24h", desc: "timetable-generator.ts — Expensive AI call, strict limit", icon: "📅", color: "general" },
                { name: "Notice Drafting: 20 req / school / 24h", desc: "notice-writer.ts — Moderate limit, common operation", icon: "📢", color: "general" },
                { name: "Report Generation: 1 batch / school / week", desc: "Behavioral narrative batch — Runs once per week max", icon: "📊", color: "general" },
                { name: "Leave Suggestion: 50 req / school / 24h", desc: "leave-suggester.ts — Lightweight, higher limit", icon: "🔄", color: "general" }
              ]
            },
            {
              name: "Redis Implementation",
              desc: "Upstash Redis REST API • Sliding window counter",
              icon: "⚡",
              color: "general",
              children: [
                { name: "Key Format", desc: "ratelimit:{schoolId}:{endpoint}:{window} → e.g., ratelimit:school_123:timetable:2026-08-24", icon: "🔑", color: "general" },
                { name: "INCR + EXPIRE", desc: "Increment counter on each request. Set TTL to window duration (24h or 7d)", icon: "📈", color: "general" },
                { name: "Limit Exceeded → 429", desc: "Return HTTP 429 Too Many Requests with Retry-After header", icon: "🚫", color: "general" }
              ]
            },
            {
              name: "Gemini API Fallback",
              desc: "Handle external AI API failures gracefully",
              icon: "🤖",
              color: "general",
              children: [
                { name: "Timeout: 30 seconds", desc: "If Gemini API doesn't respond in 30s → Return timeout error", icon: "⏰", color: "general" },
                { name: "Retry with Backoff", desc: "On 500/503: retry up to 3 times with 2s, 4s, 8s delays", icon: "🔄", color: "general" },
                { name: "Graceful Degradation", desc: "If AI fully down → Show manual mode option (e.g., manual timetable)", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👑 MASTER ADMIN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "MASTER ADMIN",
      desc: "Platform Owner • Developer-level access • role=MASTER_ADMIN",
      icon: "👑",
      color: "master",
      children: [
        {
          name: "School Management",
          desc: "Create & manage multiple school tenants • tRPC: school.ts",
          icon: "🏫",
          color: "master",
          children: [
            { name: "Create New School", desc: "school.create({ name, address, contact, subscriptionPlan }) → School row + UUID", icon: "➕", color: "master" },
            { name: "Edit School Details", desc: "school.update({ id, name?, logo?, settings? }) → Update branding, config", icon: "✏️", color: "master" },
            { name: "Activate / Deactivate", desc: "school.suspend({ id }) → Toggle school access. All users blocked when suspended", icon: "🔄", color: "master" },
            { name: "School-Specific Settings", desc: "school.update({ settings: JSON }) → Grading scale, shifts, SMS prefs, theme colors", icon: "⚙️", color: "master" },
            { name: "Duplicate School Name", desc: "Prevent two schools with identical names in same city", icon: "⚠️", color: "edge", edge: true },
            { name: "Data Isolation", desc: "withTenant() ensures School A cannot access School B data via any API", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Super Admin Assignment",
          desc: "Assign Principal/Head to each school • tRPC: user.ts",
          icon: "🔑",
          color: "master",
          children: [
            { name: "Assign Principal Account", desc: "user.create({ role: SUPER_ADMIN, schoolId }) → Auto-generate credentials", icon: "👤", color: "master" },
            { name: "Transfer Authority", desc: "Deactivate old Super Admin, create new one. Mid-year handover", icon: "🔁", color: "master" },
            { name: "Send Welcome Email", desc: "Resend API sends login credentials to new Principal's email", icon: "📧", color: "master" },
            { name: "Only One Active Super Admin", desc: "Prevent multiple principals with full simultaneous access", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Subscription Management",
          desc: "Plans, billing & usage for SaaS model",
          icon: "💎",
          color: "master",
          children: [
            { name: "Plan Creation (FREE/BASIC/PREMIUM)", desc: "Define feature limits per tier. AI features = PREMIUM only", icon: "📋", color: "master" },
            { name: "Billing & Invoicing", desc: "Razorpay/Stripe recurring subscriptions. Auto-generate monthly invoices", icon: "🧾", color: "master" },
            { name: "Usage Analytics", desc: "Track active users, storage consumed, API calls per school", icon: "📊", color: "master" },
            { name: "Grace Period Handling", desc: "Failed payment → 7-day grace period before feature restriction", icon: "⏳", color: "master" },
            { name: "Graceful Downgrade", desc: "No data loss when school downgrades plan. AI features disabled, data preserved", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Global Analytics",
          desc: "Platform-wide insights & health monitoring",
          icon: "📊",
          color: "master",
          children: [
            { name: "Total Schools", desc: "Count of active/inactive/trial schools with filter & search", icon: "🏫", color: "master" },
            { name: "Active Users", desc: "Total users across all schools, broken down by role", icon: "👥", color: "master" },
            { name: "Revenue Dashboard", desc: "MRR (Monthly Recurring Revenue), ARR, churn rate, LTV", icon: "💰", color: "master" },
            { name: "System Health", desc: "Server uptime %, DB load, error rates, API latency", icon: "🖥️", color: "master" }
          ]
        },
        {
          name: "System Settings",
          desc: "Global platform configuration",
          icon: "⚙️",
          color: "master",
          children: [
            { name: "Default Permissions Template", desc: "Baseline RBAC template applied to every new school on creation", icon: "🔒", color: "master" },
            { name: "Feature Flags (Global)", desc: "Enable/disable modules globally or per-school override", icon: "🚩", color: "master" },
            { name: "Maintenance Mode", desc: "Take entire platform offline for updates. Show maintenance page", icon: "🔧", color: "master" }
          ]
        },
        {
          name: "School Onboarding Flow",
          desc: "1-click provisioning wizard",
          icon: "🚀",
          color: "master",
          children: [
            { name: "Step 1: Create School Row", desc: "Auto-create School with default settings in database", icon: "1️⃣", color: "master" },
            { name: "Step 2: Create Super Admin", desc: "Auto-create Principal account with temporary password", icon: "2️⃣", color: "master" },
            { name: "Step 3: Send Welcome Email", desc: "Resend API delivers login credentials + getting started guide", icon: "3️⃣", color: "master" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎓 SUPER ADMIN (Principal)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "SUPER ADMIN (Principal)",
      desc: "Full school access • role=SUPER_ADMIN • Implementation Plan Lines 201-250",
      icon: "🎓",
      color: "super_admin",
      children: [
        {
          name: "School Dashboard",
          desc: "At-a-glance overview • Page: /admin/page.tsx",
          icon: "📊",
          color: "super_admin",
          children: [
            { name: "Today's Attendance Summary", desc: "attendance.getForClassDate() aggregated → % present, absent count, late arrivals", icon: "📋", color: "super_admin" },
            { name: "Fee Collection Status", desc: "fee.getStudentDues() aggregated → Collected vs pending for current month", icon: "💰", color: "super_admin" },
            { name: "Upcoming Events", desc: "AcademicSchedule query → Next exam, PTM, holidays", icon: "📅", color: "super_admin" },
            { name: "AI At-Risk Alerts", desc: "Students flagged by Early Warning cron job → Card with count + details link", icon: "🚨", color: "super_admin" },
            { name: "Syllabus Progress Overview", desc: "Syllabus table → Class-wise % completion across subjects with progress bars", icon: "📚", color: "super_admin" }
          ]
        },
        {
          name: "Academic Management",
          desc: "Classes, subjects, timetable, syllabus • /admin/classes/, /admin/timetable/",
          icon: "📚",
          color: "super_admin",
          children: [
            {
              name: "Class Management",
              desc: "tRPC: class.create, class.getAll • Page: /admin/classes/",
              icon: "🏛️",
              color: "super_admin",
              children: [
                { name: "Create Class", desc: "class.create({ name: '10th-A', section: 'A', academicYear }) → Class row", icon: "➕", color: "super_admin" },
                { name: "Edit / Delete Class", desc: "class.update() / class.delete() with cascading checks", icon: "✏️", color: "super_admin" },
                { name: "Section Management", desc: "Sections A, B, C within a class. Each section = separate Class row", icon: "📂", color: "super_admin" },
                { name: "Cannot Delete With Active Students", desc: "Block deletion if StudentProfile.classId references this class", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Subject Management",
              desc: "SubjectMaster + Subject tables",
              icon: "📖",
              color: "super_admin",
              children: [
                { name: "Add Subject", desc: "SubjectMaster.create({ name, code: 'MATH-101' }) → Master catalog entry", icon: "➕", color: "super_admin" },
                { name: "Assign to Class", desc: "Subject.create({ subjectMasterId, classId }) → Link subject to class", icon: "🔗", color: "super_admin" },
                { name: "Removing Subject With Marks", desc: "Prevent deletion if Exam/Result records reference this Subject", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Class-Teacher Mapping",
              desc: "tRPC: class.assignTeacher • ClassTeacher table",
              icon: "🔗",
              color: "super_admin",
              children: [
                { name: "Assign Subject Teacher", desc: "class.assignTeacher({ teacherId, classId, subjectId, isClassTeacher: false })", icon: "👨‍🏫", color: "super_admin" },
                { name: "Assign Class Teacher (Head)", desc: "isClassTeacher: true → One primary class teacher per section", icon: "⭐", color: "super_admin" },
                { name: "View Mapping Matrix", desc: "Grid view: Teachers × Classes × Subjects with visual indicators", icon: "📊", color: "super_admin" },
                { name: "Same Teacher, Same Period", desc: "AI check via TimetablePeriod: teacher cannot be in two classes at once", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "AI Timetable Generator",
              desc: "src/lib/ai/timetable-generator.ts • Gemini API",
              icon: "🤖",
              color: "super_admin",
              children: [
                { name: "Input Constraints", desc: "Teacher availability, room limits, subject hours, preferred time slots", icon: "📝", color: "super_admin" },
                { name: "Generate Schedule", desc: "Constraint satisfaction algo + Gemini optimization → TimetablePeriod[] rows", icon: "⚡", color: "super_admin" },
                { name: "Manual Override", desc: "Principal can swap periods manually. isAiGenerated = false for manual edits", icon: "✋", color: "super_admin" },
                { name: "Room Capacity Constraints", desc: "AI checks room capacity vs class student count", icon: "🏫", color: "super_admin" },
                { name: "Insufficient Teachers", desc: "Alert if not enough teachers to fill all required slots", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Syllabus Management",
              desc: "Syllabus table • JSON topics array",
              icon: "📝",
              color: "super_admin",
              children: [
                { name: "Upload Syllabus", desc: "topics: JSON[{topic_name, expected_hours, is_completed: false}] per subject per class", icon: "📤", color: "super_admin" },
                { name: "Set Expected Hours", desc: "expected_hours per topic for schedule tracking", icon: "⏱️", color: "super_admin" },
                { name: "Track Completion", desc: "Live progress bar: completed topics / total topics × 100", icon: "📊", color: "super_admin" },
                { name: "AI Merge Suggestions", desc: "If behind schedule, Gemini suggests combining related topics to catch up", icon: "🤖", color: "super_admin" }
              ]
            },
            {
              name: "Academic Calendar",
              desc: "AcademicSchedule table • /admin/calendar/",
              icon: "📅",
              color: "super_admin",
              children: [
                { name: "Add Events", desc: "type: EXAM | HOLIDAY | EVENT • title, date, description", icon: "➕", color: "super_admin" },
                { name: "Date-wise View", desc: "Calendar grid with color-coded event markers", icon: "📆", color: "super_admin" },
                { name: "Exam on Holiday", desc: "Warn if exam date overlaps with declared holiday in AcademicSchedule", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Teacher Management",
          desc: "Add, edit, assign roles • tRPC: user.ts • /admin/teachers/",
          icon: "👨‍🏫",
          color: "super_admin",
          children: [
            {
              name: "Add / Edit Teacher",
              desc: "user.create({ role: TEACHER }) + TeacherProfile creation",
              icon: "👤",
              color: "super_admin",
              children: [
                { name: "Personal Details", desc: "Name, DOB, contact, address → User + TeacherProfile tables", icon: "📝", color: "super_admin" },
                { name: "Qualification & Experience", desc: "Degrees, certifications, years → TeacherProfile.qualification", icon: "🎓", color: "super_admin" },
                { name: "Login Credentials", desc: "Auto-generate or manual email/password. bcryptjs hash stored", icon: "🔑", color: "super_admin" },
                { name: "Profile Photo Upload", desc: "Upload to Cloudflare R2 → User.profileImage = R2 URL", icon: "📷", color: "super_admin" },
                { name: "Duplicate Email / Phone", desc: "Block if @@unique([email, schoolId]) constraint violated", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Roles & Permissions",
              desc: "Module-level access control per teacher",
              icon: "🔒",
              color: "super_admin",
              children: [
                { name: "Module Access Control", desc: "Enable/disable specific features per teacher account", icon: "✅", color: "super_admin" },
                { name: "Revoking Mid-Session", desc: "Handle when permission removed while teacher is actively logged in", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Leave Approvals",
              desc: "tRPC: leave.approve / leave.reject • leave.getSubstituteSuggestion",
              icon: "📋",
              color: "super_admin",
              children: [
                { name: "Pending Approvals", desc: "LeaveApplication WHERE status=PENDING → List with approve/reject buttons", icon: "⏳", color: "super_admin" },
                { name: "AI Substitute Suggestion", desc: "leave.getSubstituteSuggestion({ teacherId, date }) → Ranked teacher list", icon: "🤖", color: "super_admin" },
                { name: "Leave During Exam", desc: "Flag if teacher has Exam supervision duty on leave dates", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Student Management",
          desc: "Enrollment, profiles, parent linking • tRPC: user.ts • /admin/students/",
          icon: "👨‍🎓",
          color: "super_admin",
          children: [
            {
              name: "Enrollment",
              desc: "user.create + user.bulkImport for mass enrollment",
              icon: "📝",
              color: "super_admin",
              children: [
                { name: "Add Student", desc: "user.create({ role: STUDENT }) + StudentProfile({ classId, rollNumber })", icon: "➕", color: "super_admin" },
                { name: "Bulk Import (CSV)", desc: "user.bulkImport({ csvData: StudentRow[] }) → { imported, errors[] }", icon: "📤", color: "super_admin" },
                { name: "Auto Roll Number", desc: "System assigns sequential roll numbers per class-section", icon: "🔢", color: "super_admin" },
                { name: "Duplicate Roll Number", desc: "Prevent same rollNumber in same classId via unique constraint", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Profile Management",
              desc: "StudentProfile + medical info + R2 photo storage",
              icon: "👤",
              color: "super_admin",
              children: [
                { name: "Personal Details", desc: "Name, DOB, address, blood group → StudentProfile fields", icon: "📝", color: "super_admin" },
                { name: "Medical Information", desc: "Allergies, medications, special needs → StudentProfile.medicalInfo JSON", icon: "🏥", color: "super_admin" },
                { name: "Previous School Records", desc: "TC from previous school, previous marks → Document Vault (R2)", icon: "📁", color: "super_admin" },
                { name: "Profile Photo", desc: "Upload to R2 → User.profileImage = signed URL", icon: "📷", color: "super_admin" }
              ]
            },
            {
              name: "Parent Account Linking",
              desc: "StudentProfile.parentId → ParentProfile",
              icon: "👨‍👩‍👦",
              color: "super_admin",
              children: [
                { name: "Link by Phone / Email", desc: "Find or create Parent user → Set StudentProfile.parentId", icon: "🔗", color: "super_admin" },
                { name: "Multiple Children", desc: "One ParentProfile → Many StudentProfiles. Child selector in parent dashboard", icon: "👥", color: "super_admin" },
                { name: "Wrong Student Linked", desc: "Admin must manually verify & fix incorrect parent-student mapping", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Promotion / Transfer",
              desc: "Year-end class promotion & TC generation",
              icon: "📤",
              color: "super_admin",
              children: [
                { name: "Promote to Next Class", desc: "Bulk: update StudentProfile.classId for all students in a class", icon: "⬆️", color: "super_admin" },
                { name: "Transfer Certificate (TC)", desc: "Generate official TC → PDF via @react-pdf/renderer → Upload to R2", icon: "📄", color: "super_admin" },
                { name: "Promoting Failed Student", desc: "Confirm dialog if student hasn't passed exams (Result.marksObtained < passingMarks)", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Communication",
          desc: "Notices, SMS • tRPC: notice.ts • /admin/notices/",
          icon: "📢",
          color: "super_admin",
          children: [
            {
              name: "Notice Board",
              desc: "Notice table • AI drafting • Multi-target publishing",
              icon: "📌",
              color: "super_admin",
              children: [
                { name: "AI Smart Notices", desc: "notice.aiDraft({ topic }) → { titleEn, contentEn, contentHi } via Gemini", icon: "🤖", color: "super_admin" },
                { name: "Create Notice", desc: "notice.create({ title, content, attachments: JSON[R2 URLs] })", icon: "✏️", color: "super_admin" },
                { name: "Target by Role", desc: "targetRoles: JSON['TEACHER','PARENT'] → Only specified roles see it", icon: "🎯", color: "super_admin" },
                { name: "Target by Class", desc: "targetClasses: JSON['class_10_A'] → Only specific class sees it", icon: "🏛️", color: "super_admin" },
                { name: "Schedule Notice", desc: "publishDate: DateTime → Draft now, auto-publish at scheduled time", icon: "⏰", color: "super_admin" },
                { name: "Sending to Inactive Users", desc: "Skip users where isActive=false, log delivery failures", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Bulk SMS (DLT)",
              desc: "MSG91 API • TRAI DLT-approved templates • Sender ID: SCHERP",
              icon: "📱",
              color: "super_admin",
              children: [
                { name: "Template Management", desc: "DLT-approved SMS templates registered with TRAI via MSG91", icon: "📋", color: "super_admin" },
                { name: "Recipient Selection", desc: "Class-wise or role-wise bulk SMS targeting", icon: "👥", color: "super_admin" },
                { name: "Delivery Reports", desc: "MSG91 callback → Track sent/delivered/failed status", icon: "📊", color: "super_admin" },
                { name: "DLT Template Not Approved", desc: "Fallback: Use generic approved template if specific one rejected by TRAI", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Email Notifications (Resend)",
              desc: "Welcome emails, password resets, fee confirmations",
              icon: "📧",
              color: "super_admin",
              children: [
                { name: "Welcome Email", desc: "Auto-sent on user creation with login credentials", icon: "👋", color: "super_admin" },
                { name: "Password Reset", desc: "Secure reset link via Resend API", icon: "🔑", color: "super_admin" },
                { name: "Fee Payment Confirmation", desc: "Auto-sent when FeePayment.status = PAID", icon: "✅", color: "super_admin" }
              ]
            }
          ]
        },
        {
          name: "Transport Management",
          desc: "Vehicles, routes, drivers • tRPC: transport.ts • /admin/transport/",
          icon: "🚌",
          color: "super_admin",
          children: [
            {
              name: "Vehicle Management",
              desc: "Vehicle table CRUD",
              icon: "🚐",
              color: "super_admin",
              children: [
                { name: "Add Vehicle", desc: "transport.createVehicle({ busNumber, capacity }) → Vehicle row", icon: "➕", color: "super_admin" },
                { name: "Fitness Certificate", desc: "Track validity & renewal dates. Alert before expiry", icon: "📜", color: "super_admin" },
                { name: "Overcapacity Assignment", desc: "Block if assigned students > Vehicle.capacity", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Route Management",
              desc: "Route table • JSON stops with lat/lng/time",
              icon: "🗺️",
              color: "super_admin",
              children: [
                { name: "Define Route", desc: "transport.createRoute({ name, stops: JSON[{name, lat, lng, time}] })", icon: "📍", color: "super_admin" },
                { name: "Assign Vehicle to Route", desc: "Route.vehicleId = vehicle.id", icon: "🔗", color: "super_admin" },
                { name: "Route Without Driver", desc: "Alert if Route has Vehicle but driverId is NULL", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Driver Assignment",
              desc: "DriverProfile ↔ Vehicle ↔ Route linkage",
              icon: "🧑‍✈️",
              color: "super_admin",
              children: [
                { name: "Assign Driver", desc: "DriverProfile.assignedVehicleId + Route.driverId", icon: "🔗", color: "super_admin" },
                { name: "License Verification", desc: "DriverProfile.licenseNumber + expiry date validation", icon: "🪪", color: "super_admin" },
                { name: "Driver on Multiple Vehicles", desc: "@@unique(assignedVehicleId) prevents one driver on two buses", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Fee Management",
          desc: "Fee structure, payments, reconciliation • tRPC: fee.ts • /admin/fees/",
          icon: "💰",
          color: "super_admin",
          children: [
            {
              name: "Fee Structure Setup",
              desc: "FeeStructure table • Per class per academic year",
              icon: "📋",
              color: "super_admin",
              children: [
                { name: "Define Fee Types", desc: "feeType: TUITION | TRANSPORT | LIBRARY | SPORTS", icon: "📂", color: "super_admin" },
                { name: "Set Amount per Class", desc: "fee.createStructure({ classId, amount, frequency: MONTHLY|QUARTERLY|ANNUAL })", icon: "💵", color: "super_admin" },
                { name: "Due Date & Late Fee", desc: "dueDate + lateFeePerDay for automatic penalty calculation", icon: "📅", color: "super_admin" },
                { name: "Changing Fee Mid-Year", desc: "Handle students who paid old rate vs new rate. No retroactive charges", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Auto Fee Reconciliation (SmartCollect)",
              desc: "Razorpay Virtual Accounts • Webhook auto-match",
              icon: "🤖",
              color: "super_admin",
              children: [
                { name: "SmartCollect Integration", desc: "Razorpay API creates Customer + Virtual Bank Account per student", icon: "🏦", color: "super_admin" },
                { name: "Virtual Account per Student", desc: "StudentProfile.virtualAccountId = unique UPI/Account number", icon: "🔢", color: "super_admin" },
                { name: "Auto Mark as Paid", desc: "Webhook → FeePayment.status = 'PAID', paymentDate = now(), transactionId = razorpay_id", icon: "✅", color: "super_admin" },
                { name: "Partial Payment", desc: "FeePayment.status = 'PARTIAL' when amountPaid < FeeStructure.amount", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Concession / Scholarship",
              desc: "Fee discounts for eligible students",
              icon: "🎁",
              color: "super_admin",
              children: [
                { name: "Apply Discount", desc: "Percentage or fixed amount discount on FeeStructure", icon: "💸", color: "super_admin" },
                { name: "Category-based", desc: "Staff child, sibling, merit, EWS categories", icon: "📂", color: "super_admin" },
                { name: "Concession Exceeds Fee", desc: "Prevent discount amount > actual FeeStructure.amount", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Financial Reports",
              desc: "Collection, dues, expense summaries • Export to Excel/PDF",
              icon: "📊",
              color: "super_admin",
              children: [
                { name: "Collection Summary", desc: "Daily/monthly/yearly aggregation of FeePayment WHERE status=PAID", icon: "📈", color: "super_admin" },
                { name: "Defaulters List", desc: "Students WHERE FeePayment.status = OVERDUE", icon: "📋", color: "super_admin" },
                { name: "Expense Tracking", desc: "Expense table aggregation by category with approval status", icon: "💸", color: "super_admin" },
                { name: "Export to Excel / PDF", desc: "Download reports via xlsx or @react-pdf/renderer libraries", icon: "📥", color: "super_admin" }
              ]
            }
          ]
        },
        {
          name: "Reports & Analytics",
          desc: "School-wide insights & AI alerts • /admin/reports/",
          icon: "📊",
          color: "super_admin",
          children: [
            {
              name: "Attendance Reports",
              desc: "Aggregated Attendance table queries",
              icon: "📋",
              color: "super_admin",
              children: [
                { name: "Class-wise Summary", desc: "GROUP BY classId → Attendance % per class per month", icon: "🏛️", color: "super_admin" },
                { name: "Student-wise Detail", desc: "Individual student attendance records with calendar view", icon: "👤", color: "super_admin" },
                { name: "Monthly / Yearly Trends", desc: "Chart.js / Recharts visual charts showing attendance patterns", icon: "📈", color: "super_admin" },
                { name: "Export Options", desc: "Download as Excel, PDF, or CSV via export library", icon: "📥", color: "super_admin" }
              ]
            },
            {
              name: "Exam & Result Reports",
              desc: "Performance analytics from Result table",
              icon: "📝",
              color: "super_admin",
              children: [
                { name: "Class Toppers", desc: "ORDER BY SUM(marksObtained) DESC → Rank list per class per exam", icon: "🏆", color: "super_admin" },
                { name: "Subject-wise Analysis", desc: "AVG, MAX, MIN marks per Subject per Exam", icon: "📊", color: "super_admin" },
                { name: "Grade Distribution", desc: "COUNT by grade → A+: 5, A: 12, B+: 8, etc.", icon: "📈", color: "super_admin" }
              ]
            },
            {
              name: "AI At-Risk Early Warning",
              desc: "Background cron job • Weekly analysis",
              icon: "🚨",
              color: "super_admin",
              children: [
                { name: "Attendance Drop Detection", desc: "Flag: current month % < previous month % by >20 points", icon: "📉", color: "super_admin" },
                { name: "Performance Decline", desc: "Alert: marksObtained dropped >15% across 2 consecutive exams", icon: "⬇️", color: "super_admin" },
                { name: "Homework Non-Submission", desc: "Track: >50% homework missed in current month", icon: "📝", color: "super_admin" },
                { name: "Alert Dashboard", desc: "Card per at-risk student with details + recommended intervention", icon: "📊", color: "super_admin" },
                { name: "False Positive Alerts", desc: "Allow dismissing alerts with reason (e.g., 'medical leave' → acknowledged)", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Behavioral & Skill Report (AI)",
              desc: "Gemini narrative generation from teacher tags",
              icon: "🧠",
              color: "super_admin",
              children: [
                { name: "Tag Aggregation", desc: "Collect all behavioral tags assigned by teachers throughout the year", icon: "🏷️", color: "super_admin" },
                { name: "AI Narrative Generation", desc: "result.generateAiReport({ studentId }) → Gemini creates 2-3 para personality report", icon: "🤖", color: "super_admin" },
                { name: "Report Card Integration", desc: "Attach AI narrative alongside marks in final Result export", icon: "📄", color: "super_admin" }
              ]
            }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👨‍🏫 TEACHER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "TEACHER",
      desc: "Class management • Attendance • Results • role=TEACHER",
      icon: "👨‍🏫",
      color: "teacher",
      children: [
        {
          name: "Teacher Dashboard",
          desc: "Today's tasks & schedule • /teacher/page.tsx",
          icon: "📊",
          color: "teacher",
          children: [
            { name: "Today's Schedule", desc: "TimetablePeriod WHERE teacherId = me AND dayOfWeek = today → List with room numbers", icon: "📅", color: "teacher" },
            { name: "Pending Tasks", desc: "Unmarked attendance (no Attendance row for today's classes) + unchecked homework", icon: "⏳", color: "teacher" },
            { name: "Notifications (Pusher)", desc: "Realtime: leave approval updates, notices from admin, substitution alerts", icon: "🔔", color: "teacher" }
          ]
        },
        {
          name: "Attendance Marking",
          desc: "tRPC: attendance.markBulk • Offline-capable • /teacher/attendance/",
          icon: "✅",
          color: "teacher",
          children: [
            { name: "Mark Present / Absent / Late / Half-Day", desc: "Select class → attendance.markBulk({ classId, date, records: [{studentId, status}] })", icon: "📋", color: "teacher" },
            { name: "Bulk Mark (All Present)", desc: "One-click: set all students to PRESENT, then edit exceptions manually", icon: "⚡", color: "teacher" },
            { name: "Edit Past Attendance", desc: "Modify previous day's attendance (requires Principal approval workflow)", icon: "✏️", color: "teacher" },
            { name: "Offline Mode (Dexie.js)", desc: "No internet → Save to IndexedDB syncQueue → Auto-sync on reconnect", icon: "📴", color: "teacher" },
            { name: "syncedAt Timestamp", desc: "Each attendance record has syncedAt for conflict resolution (last-write-wins)", icon: "⏰", color: "teacher" },
            { name: "Wrong Date Attendance", desc: "Frontend validation: cannot select future dates. Backend rejects date > today", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Homework Management",
          desc: "Homework table CRUD • File attachments via R2 • /teacher/homework/",
          icon: "📝",
          color: "teacher",
          children: [
            { name: "Create Homework", desc: "Homework.create({ classId, subjectId, title, description, dueDate })", icon: "➕", color: "teacher" },
            { name: "Attach Files", desc: "Upload PDF/images to Cloudflare R2 → attachments: JSON[R2 URLs]", icon: "📎", color: "teacher" },
            { name: "View Submissions", desc: "Check which students submitted homework and when (submission tracking)", icon: "📥", color: "teacher" },
            { name: "Due Date in Past", desc: "Warn if teacher sets dueDate that already passed", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Exam & Result Management",
          desc: "tRPC: result.createExam, result.uploadMarks • /teacher/results/",
          icon: "📊",
          color: "teacher",
          children: [
            { name: "Create Exam", desc: "result.createExam({ name, subjectId, date, totalMarks, passingMarks, type: UNIT_TEST|MID_TERM|FINAL })", icon: "➕", color: "teacher" },
            { name: "Upload Marks", desc: "result.uploadMarks({ examId, marks: [{studentId, marksObtained, remarks?}] })", icon: "📤", color: "teacher" },
            { name: "Bulk Excel Import", desc: "Upload Excel file → Parse → Validate → Bulk insert into Result table", icon: "📊", color: "teacher" },
            { name: "Auto Grade Calculation", desc: "System calculates Result.grade from marksObtained using School.settings.gradingScale", icon: "🤖", color: "teacher" },
            { name: "Publish Results", desc: "Toggle isPublished flag → Results visible to students & parents", icon: "📢", color: "teacher" },
            { name: "Marks Exceeding Total", desc: "Block if marksObtained > Exam.totalMarks via zod validation", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Syllabus Progress",
          desc: "Syllabus.topics JSON update • /teacher/syllabus/",
          icon: "📚",
          color: "teacher",
          children: [
            { name: "Mark Topic Completed", desc: "Update topics JSON: set is_completed = true, completion_date = today", icon: "✅", color: "teacher" },
            { name: "View Progress Bar", desc: "Completed topics / total topics × 100 = visual progress indicator", icon: "📊", color: "teacher" },
            { name: "AI Catch-up Suggestions", desc: "If completion % behind expected schedule → Gemini suggests topic merging strategies", icon: "🤖", color: "teacher" }
          ]
        },
        {
          name: "Student Behavioral Tags",
          desc: "Predefined personality trait tagging system",
          icon: "🏷️",
          color: "teacher",
          children: [
            { name: "Add Tag", desc: "Predefined tags: Leadership, Creative, Helpful, Distracted, etc.", icon: "➕", color: "teacher" },
            { name: "View Tag History", desc: "All tags given to a student over time with teacher name & date", icon: "📋", color: "teacher" },
            { name: "Inappropriate Tag", desc: "Moderate/block offensive or biased tags before saving", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Leave Application",
          desc: "tRPC: leave.apply • LeaveApplication table • /teacher/leave/",
          icon: "🏖️",
          color: "teacher",
          children: [
            { name: "Apply for Leave", desc: "leave.apply({ leaveType: SICK|CASUAL|PERSONAL, fromDate, toDate, reason })", icon: "📝", color: "teacher" },
            { name: "Track Status", desc: "LeaveApplication.status: PENDING → APPROVED / REJECTED", icon: "📋", color: "teacher" },
            { name: "AI Substitute View", desc: "See who AI suggests as replacement via leave.getSubstituteSuggestion()", icon: "🤖", color: "teacher" },
            { name: "Leave During Exam Duty", desc: "Warn if teacher has Exam supervision or scheduled class during leave dates", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Class Schedule View",
          desc: "TimetablePeriod WHERE teacherId = me • /teacher/schedule/",
          icon: "📅",
          color: "teacher",
          children: [
            { name: "Weekly Timetable", desc: "Day-wise period-wise grid from TimetablePeriod table", icon: "📆", color: "teacher" },
            { name: "Room Assignment", desc: "TimetablePeriod.room → Which room/lab for each period", icon: "🏫", color: "teacher" },
            { name: "Substitution Alerts", desc: "Pusher notification when assigned as substitute for absent teacher", icon: "🔔", color: "teacher" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👨‍🎓 STUDENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "STUDENT",
      desc: "View attendance, results, homework, leave • role=STUDENT",
      icon: "👨‍🎓",
      color: "student",
      children: [
        {
          name: "Student Dashboard",
          desc: "Personal overview & quick access • /student/page.tsx",
          icon: "📊",
          color: "student",
          children: [
            { name: "Profile Overview", desc: "User.profileImage + StudentProfile(name, class, rollNumber, section)", icon: "👤", color: "student" },
            { name: "Today's Schedule", desc: "TimetablePeriod WHERE classId = myClassId AND dayOfWeek = today", icon: "📅", color: "student" },
            { name: "Upcoming Tests", desc: "Exam WHERE classId = myClassId AND date > today ORDER BY date ASC LIMIT 5", icon: "📝", color: "student" },
            { name: "Pending Homework", desc: "Homework WHERE classId = myClassId AND dueDate >= today AND not submitted", icon: "⏳", color: "student" }
          ]
        },
        {
          name: "Attendance View",
          desc: "tRPC: attendance.getStudentCalendar • /student/attendance/",
          icon: "📋",
          color: "student",
          children: [
            { name: "Calendar View", desc: "Color-coded calendar: green=PRESENT, red=ABSENT, yellow=LATE, blue=HALF_DAY", icon: "📆", color: "student" },
            { name: "Monthly Summary", desc: "attendance.getStudentStats({ month, year }) → { present, absent, late, percentage }", icon: "📊", color: "student" },
            { name: "Below Minimum %", desc: "Alert banner if attendance drops below school requirement (e.g., 75%)", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Results & Report Cards",
          desc: "tRPC: result.getStudentResults • /student/results/",
          icon: "📊",
          color: "student",
          children: [
            { name: "Exam-wise Marks", desc: "result.getStudentResults({ studentId }) → All exams with subject breakdown", icon: "📝", color: "student" },
            { name: "Grade Card View", desc: "Official grade card format with school logo + grading scale", icon: "📄", color: "student" },
            { name: "Progress Trend Chart", desc: "Recharts line chart showing marks trend across UNIT_TEST → MID_TERM → FINAL", icon: "📈", color: "student" },
            { name: "Download Report Card", desc: "@react-pdf/renderer generates PDF → R2 URL → Download button", icon: "📥", color: "student" }
          ]
        },
        {
          name: "Homework",
          desc: "View & submit assignments • /student/homework/",
          icon: "📝",
          color: "student",
          children: [
            { name: "View Assigned", desc: "Homework WHERE classId = myClassId ORDER BY dueDate ASC", icon: "📋", color: "student" },
            { name: "Submit Online", desc: "Upload file (PDF/image) to R2 as submission attachment", icon: "📤", color: "student" },
            { name: "Submission Status", desc: "Submitted ✅ / Pending ⏳ / Late ⚠️ indicator per homework", icon: "✅", color: "student" },
            { name: "Late Submission", desc: "Mark as late if submitted after Homework.dueDate", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Syllabus Progress View",
          desc: "Syllabus topics progress • /student/syllabus/",
          icon: "📚",
          color: "student",
          children: [
            { name: "Subject-wise Topics", desc: "Syllabus.topics JSON → All topics listed per subject", icon: "📖", color: "student" },
            { name: "Completed vs Pending", desc: "Visual split: topics where is_completed=true vs false", icon: "📊", color: "student" },
            { name: "Progress Percentage", desc: "Overall & per-subject: completed/total × 100", icon: "📈", color: "student" }
          ]
        },
        {
          name: "Timetable View",
          desc: "TimetablePeriod for student's class • /student/timetable/",
          icon: "📅",
          color: "student",
          children: [
            { name: "Today's Classes", desc: "TimetablePeriod WHERE classId AND dayOfWeek = today", icon: "📋", color: "student" },
            { name: "Full Week Schedule", desc: "Monday to Saturday period grid with subjects & rooms", icon: "📆", color: "student" },
            { name: "Teacher Info per Period", desc: "JOIN with User table → Show teacher name for each period", icon: "👨‍🏫", color: "student" }
          ]
        },
        {
          name: "Leave Application",
          desc: "tRPC: leave.apply • Parent consent flow • /student/leave/",
          icon: "🏖️",
          color: "student",
          children: [
            { name: "Apply for Leave", desc: "leave.apply({ leaveType, fromDate, toDate, reason }) → Status: PENDING", icon: "📝", color: "student" },
            { name: "Parent Consent Required", desc: "Student leave → First parent approves → Then school processes", icon: "👨‍👩‍👦", color: "student" },
            { name: "Track Application", desc: "Status flow: Pending → Parent Approved → School Approved/Rejected", icon: "📋", color: "student" },
            { name: "Leave During Exam", desc: "Warn student if Exam.date overlaps with leave fromDate-toDate", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Notice Board",
          desc: "tRPC: notice.getForUser • /student/notices/",
          icon: "📌",
          color: "student",
          children: [
            { name: "All Notices", desc: "notice.getForUser({ role: STUDENT, classId }) → Chronological list", icon: "📋", color: "student" },
            { name: "Filtered by Relevance", desc: "Only notices where targetRoles includes STUDENT AND targetClasses includes myClass", icon: "🎯", color: "student" },
            { name: "Read / Unread", desc: "Visual indicator (badge/dot) for unread notices", icon: "🔵", color: "student" }
          ]
        },
        {
          name: "Transport Details",
          desc: "tRPC: transport.getStudentRoute • /student/transport/",
          icon: "🚌",
          color: "student",
          children: [
            { name: "Assigned Route", desc: "transport.getStudentRoute({ studentId }) → Route name, stop list, timings", icon: "🗺️", color: "student" },
            { name: "Bus Number & Timing", desc: "Vehicle.busNumber + Route.stops pickup/drop time", icon: "🚐", color: "student" },
            { name: "Driver Contact", desc: "DriverProfile.contact (PII masked for students: only name visible)", icon: "📞", color: "student" }
          ]
        },
        {
          name: "Document Vault (DigiLocker Style)",
          desc: "Secure digital document storage in R2",
          icon: "🔒",
          color: "student",
          children: [
            { name: "Report Cards", desc: "All years' report card PDFs stored in R2 with signed URLs", icon: "📄", color: "student" },
            { name: "Certificates", desc: "Achievement certificates, participation certs uploaded by admin", icon: "🏆", color: "student" },
            { name: "Medical Records", desc: "Vaccination records, health checkup reports → cryptographically verified by school", icon: "🏥", color: "student" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👨‍👩‍👦 PARENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "PARENT",
      desc: "Child monitoring • Fee payment • Communication • role=PARENT",
      icon: "👨‍👩‍👦",
      color: "parent",
      children: [
        {
          name: "Parent Dashboard",
          desc: "Child-centric overview • /parent/page.tsx",
          icon: "📊",
          color: "parent",
          children: [
            { name: "Child Selector", desc: "ParentProfile → StudentProfiles[] → Horizontal scroll if multiple children", icon: "👥", color: "parent" },
            { name: "Quick Summary", desc: "Attendance %, pending fees (FeePayment.status=PENDING), last exam marks", icon: "📋", color: "parent" },
            { name: "Notifications (Pusher)", desc: "Realtime: Fee reminders, notice alerts, leave approval updates", icon: "🔔", color: "parent" },
            { name: "No Child Linked", desc: "If ParentProfile has no StudentProfiles → Show setup wizard to contact admin", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Attendance View",
          desc: "Child's attendance tracking • /parent/attendance/",
          icon: "📋",
          color: "parent",
          children: [
            { name: "Attendance Calendar", desc: "attendance.getStudentCalendar({ studentId }) → Color-coded monthly calendar", icon: "📆", color: "parent" },
            { name: "Absent Days List", desc: "Attendance WHERE status=ABSENT → List with LeaveApplication status", icon: "📋", color: "parent" },
            { name: "Attendance Percentage", desc: "attendance.getStudentStats → Overall & monthly %", icon: "📊", color: "parent" }
          ]
        },
        {
          name: "Marks & Results",
          desc: "Child's academic performance • /parent/results/",
          icon: "📊",
          color: "parent",
          children: [
            { name: "Exam Results", desc: "result.getStudentResults({ studentId }) → Subject-wise marks per exam", icon: "📝", color: "parent" },
            { name: "Progress Trends", desc: "Recharts chart showing improvement/decline across exams", icon: "📈", color: "parent" },
            { name: "Download Report Card", desc: "PDF generated via @react-pdf/renderer → Download from R2", icon: "📥", color: "parent" }
          ]
        },
        {
          name: "Fee Payment",
          desc: "tRPC: fee.ts • Razorpay integration • /parent/fees/",
          icon: "💳",
          color: "parent",
          children: [
            { name: "View Fee Dues", desc: "fee.getStudentDues({ studentId }) → Breakup: Tuition, Transport, Late Fee", icon: "📋", color: "parent" },
            { name: "Pay Online (Razorpay)", desc: "fee.initiatePayment → Razorpay checkout (UPI, Card, NetBanking)", icon: "💳", color: "parent" },
            { name: "Offline Payment → Receipt", desc: "Pay at school counter → Accountant calls fee.recordOffline → Auto-receipt", icon: "🧾", color: "parent" },
            { name: "Payment History", desc: "FeePayment WHERE studentId → All past payments with transactionId", icon: "📜", color: "parent" },
            { name: "Download Receipt (PDF)", desc: "fee.downloadReceipt({ paymentId }) → R2 signed URL → PDF download", icon: "📥", color: "parent" },
            { name: "Payment Failure / Retry", desc: "Razorpay failure callback → Allow retry. Idempotency key prevents double charge", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Syllabus Progress",
          desc: "Track child's course coverage • /parent/syllabus/",
          icon: "📚",
          color: "parent",
          children: [
            { name: "Subject-wise Completion", desc: "Syllabus.topics → % completed per subject", icon: "📊", color: "parent" },
            { name: "Comparison with Expected", desc: "actual completion % vs expected_hours schedule → Is teacher on track?", icon: "📈", color: "parent" }
          ]
        },
        {
          name: "Behavioral Report (AI)",
          desc: "AI-generated personality assessment from tags",
          icon: "🧠",
          color: "parent",
          children: [
            { name: "Year-long Tag Summary", desc: "All behavioral tags given by all teachers throughout the year", icon: "🏷️", color: "parent" },
            { name: "AI Narrative Report", desc: "result.generateAiReport → Gemini-generated 2-3 paragraph personality assessment", icon: "🤖", color: "parent" },
            { name: "Strengths & Improvements", desc: "Clear list of strong areas & areas needing work extracted from AI narrative", icon: "📋", color: "parent" }
          ]
        },
        {
          name: "Teacher Information",
          desc: "Child's teachers & contact • /parent/teachers/",
          icon: "👨‍🏫",
          color: "parent",
          children: [
            { name: "Class Teacher Details", desc: "ClassTeacher WHERE isClassTeacher=true → Name, subject, contact", icon: "⭐", color: "parent" },
            { name: "Subject Teacher List", desc: "ClassTeacher WHERE classId → All subject teachers with names", icon: "📋", color: "parent" },
            { name: "Teacher Changed Mid-Year", desc: "Notify parent via Pusher when ClassTeacher mapping changes", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Transport Details",
          desc: "Child's bus route & driver • /parent/transport/",
          icon: "🚌",
          color: "parent",
          children: [
            { name: "Route & Stops", desc: "transport.getStudentRoute → Route.stops JSON with names & timings", icon: "🗺️", color: "parent" },
            { name: "Driver Details", desc: "DriverProfile: name, phone, licenseNumber (full access for parents)", icon: "🧑‍✈️", color: "parent" },
            { name: "Route Changed Without Notice", desc: "Alert parent if Route.stops or timings modified without prior notification", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Notice Board",
          desc: "notice.getForUser({ role: PARENT }) • /parent/notices/",
          icon: "📌",
          color: "parent",
          children: [
            { name: "School Notices", desc: "General school announcements targeted at PARENT role", icon: "📋", color: "parent" },
            { name: "Fee Reminders (Automated)", desc: "Auto-generated notices when FeePayment.dueDate approaching", icon: "💰", color: "parent" },
            { name: "Exam Schedule", desc: "AcademicSchedule WHERE type=EXAM → Upcoming exam dates & subjects", icon: "📅", color: "parent" }
          ]
        },
        {
          name: "Leave Approval",
          desc: "Parent consent for child's leave • /parent/leave/",
          icon: "✅",
          color: "parent",
          children: [
            { name: "View Applications", desc: "LeaveApplication WHERE userId = childId → All leave requests from child", icon: "📋", color: "parent" },
            { name: "Approve / Reject", desc: "Parent gives consent → Then school admin processes final approval", icon: "👍", color: "parent" },
            { name: "Approving During Exam", desc: "Strong warning if child's leave dates overlap with Exam.date", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Document Vault",
          desc: "Access child's secured documents from R2 • /parent/vault/",
          icon: "🔒",
          color: "parent",
          children: [
            { name: "Report Cards", desc: "Download all years' report card PDFs from R2 storage", icon: "📄", color: "parent" },
            { name: "Transfer Certificates", desc: "TC issued by school → PDF stored in R2", icon: "📜", color: "parent" },
            { name: "Medical Records", desc: "Health checkup & vaccination records with school verification stamp", icon: "🏥", color: "parent" },
            { name: "Download / Share", desc: "R2 signed URL → Download as PDF or share via link", icon: "📤", color: "parent" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚌 DRIVER / CONDUCTOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "DRIVER / CONDUCTOR",
      desc: "Profile, route details, vehicle status • role=DRIVER • Ultra-minimal dark UI",
      icon: "🚌",
      color: "driver",
      children: [
        {
          name: "Profile Management",
          desc: "DriverProfile table • /driver/profile/",
          icon: "👤",
          color: "driver",
          children: [
            { name: "Personal Details", desc: "DriverProfile: name, phone, address, emergency contact", icon: "📝", color: "driver" },
            { name: "License Number & Validity", desc: "DriverProfile.licenseNumber + expiry date tracking", icon: "🪪", color: "driver" },
            { name: "Emergency Contact", desc: "DriverProfile.emergencyContact → Family member for emergencies", icon: "📞", color: "driver" },
            { name: "License Expired", desc: "Alert & restrict dashboard access if license expiry date < today", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Route Details",
          desc: "tRPC: transport.getDriverRoute • /driver/route/",
          icon: "🗺️",
          color: "driver",
          children: [
            { name: "Assigned Route", desc: "transport.getDriverRoute({ driverId }) → Route name, all stop details", icon: "📍", color: "driver" },
            { name: "Stop Timings", desc: "Route.stops JSON → Expected arrival time at each stop", icon: "⏰", color: "driver" },
            { name: "Student List on Route", desc: "StudentProfile WHERE routeId → Names & pickup points", icon: "👥", color: "driver" },
            { name: "No Route Assigned", desc: "If Route WHERE driverId = me returns empty → Show 'Contact Admin' message", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Vehicle Status",
          desc: "Vehicle table details • /driver/vehicle/",
          icon: "🚐",
          color: "driver",
          children: [
            { name: "Bus Number", desc: "Vehicle.busNumber → Registration number & model", icon: "🔢", color: "driver" },
            { name: "Capacity & Load", desc: "Vehicle.capacity vs COUNT(StudentProfile on this route)", icon: "📊", color: "driver" },
            { name: "Fitness Certificate", desc: "Certificate validity & renewal reminder alert", icon: "📜", color: "driver" }
          ]
        },
        {
          name: "UI Design Notes",
          desc: "Driver-specific UX considerations",
          icon: "🎨",
          color: "driver",
          children: [
            { name: "Ultra-Minimal Dark Mode", desc: "Massive touch targets (min 44×44px). Icon-driven design", icon: "🌙", color: "driver" },
            { name: "Language Toggle", desc: "1-click switch to Hindi/regional language for driver comfort", icon: "🌐", color: "driver" },
            { name: "Mobile-First Layout", desc: "Designed for 360px width phone screens", icon: "📱", color: "driver" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💼 ACCOUNTANT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "ACCOUNTANT",
      desc: "Fee collection • Receipts • Expenses • Reports • role=ACCOUNTANT",
      icon: "💼",
      color: "accountant",
      children: [
        {
          name: "Fee Collection Dashboard",
          desc: "Today's collections & pending overview • /accountant/page.tsx",
          icon: "💰",
          color: "accountant",
          children: [
            { name: "Today's Collections", desc: "SUM(FeePayment.amountPaid) WHERE paymentDate = today → Online + Offline total", icon: "📊", color: "accountant" },
            { name: "Pending Dues Overview", desc: "SUM(FeeStructure.amount - FeePayment.amountPaid) WHERE status != PAID", icon: "📋", color: "accountant" },
            { name: "Class-wise Summary", desc: "GROUP BY classId → Collection % per class", icon: "🏛️", color: "accountant" },
            { name: "Manual Entry Mismatch", desc: "Flag when physical cash collected doesn't match system records", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Receipt Generation",
          desc: "Online auto + Offline manual • @react-pdf/renderer or jspdf",
          icon: "🧾",
          color: "accountant",
          children: [
            { name: "Online Payment Receipt", desc: "Auto-generated when Razorpay webhook confirms payment → PDF → R2 → onlineReceiptUrl", icon: "💳", color: "accountant" },
            { name: "Offline Payment Receipt", desc: "fee.recordOffline() → Generate receipt with unique receiptNumber", icon: "💵", color: "accountant" },
            { name: "Bulk Receipt Print", desc: "Select date range → Generate batch PDF with all receipts", icon: "🖨️", color: "accountant" },
            { name: "Duplicate Receipt Number", desc: "@@unique(receiptNumber) in FeePayment prevents duplicate receipt numbers", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Expense Management",
          desc: "Expense table CRUD + approval workflow • /accountant/expenses/",
          icon: "💸",
          color: "accountant",
          children: [
            { name: "Add Expense", desc: "Expense.create({ category, amount, date, description })", icon: "➕", color: "accountant" },
            { name: "Attach Receipt / Invoice", desc: "Upload vendor bill scan to R2 → Expense.receiptAttachment = R2 URL", icon: "📎", color: "accountant" },
            { name: "Approval Workflow", desc: "Expenses above threshold → Expense.approvedBy = NULL until Principal approves", icon: "✅", color: "accountant" },
            { name: "Expense Exceeds Budget", desc: "Warn if SUM(category expenses this month) exceeds allocated budget", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Auto Reconciliation View",
          desc: "SmartCollect payment matching • /accountant/reconcile/",
          icon: "🤖",
          color: "accountant",
          children: [
            { name: "SmartCollect Dashboard", desc: "Overview of all virtual account payments received today", icon: "📊", color: "accountant" },
            { name: "Matched Payments", desc: "FeePayment WHERE transactionId IS NOT NULL AND status = PAID", icon: "✅", color: "accountant" },
            { name: "Unmatched / Pending", desc: "Payments received but not auto-matched → Manual resolution queue", icon: "⏳", color: "accountant" },
            { name: "Wrong Virtual Account", desc: "Payment sent to incorrect student's virtualAccountId → Manual reassignment", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Financial Reports",
          desc: "Comprehensive financial analytics • /accountant/reports/",
          icon: "📊",
          color: "accountant",
          children: [
            { name: "Income vs Expense", desc: "Monthly/yearly: SUM(FeePayment.amountPaid) vs SUM(Expense.amount)", icon: "📈", color: "accountant" },
            { name: "Monthly Statement", desc: "Detailed month-wise financial statement with line items", icon: "📋", color: "accountant" },
            { name: "Tax-ready Export", desc: "Export data formatted for tax filing (Excel/CSV with GST columns)", icon: "📤", color: "accountant" },
            { name: "Audit Trail Log", desc: "Immutable log of ALL financial transactions. Cannot be deleted/modified", icon: "🔒", color: "accountant" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔧 TESTING & VERIFICATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "TESTING & VERIFICATION",
      desc: "Implementation Plan Lines 496-508 • TRD Section 11",
      icon: "🧪",
      color: "general",
      children: [
        {
          name: "Automated Tests",
          desc: "Jest/Vitest + Playwright + TypeScript build",
          icon: "🤖",
          color: "general",
          children: [
            { name: "Unit Tests (Jest/Vitest)", desc: "Test all 9 tRPC routers independently with mocked Prisma", icon: "🧩", color: "general" },
            { name: "E2E Tests (Playwright)", desc: "Login as each role → Verify correct dashboard loads → Test critical flows", icon: "🎭", color: "general" },
            { name: "TypeScript Build Check", desc: "npm run build → Zero compilation errors. Strict mode enabled", icon: "🔷", color: "general" },
            { name: "Offline Sync Test", desc: "Teacher marks attendance offline → Verify auto-sync on reconnect", icon: "📴", color: "general" },
            { name: "Payment Flow Test", desc: "Parent pays fee → Verify Razorpay webhook auto-reconciles → Receipt generated", icon: "💳", color: "general" }
          ]
        },
        {
          name: "Manual Verification",
          desc: "Role-based testing + sandbox + responsiveness",
          icon: "👁️",
          color: "general",
          children: [
            { name: "7-Role Login Test", desc: "Login as each of 7 roles → Verify all role-specific features accessible", icon: "🔑", color: "general" },
            { name: "Razorpay Sandbox", desc: "Test mode payments → Verify webhook processing → Receipt download", icon: "💳", color: "general" },
            { name: "AI Feature Quality", desc: "Gemini output review: timetable quality, narrative report coherence", icon: "🤖", color: "general" },
            { name: "Mobile Responsiveness", desc: "Chrome DevTools + real devices → All dashboards at 360px width", icon: "📱", color: "general" },
            { name: "Load Testing (k6/Artillery)", desc: "Simulate 1000 concurrent users → Verify no DB connection leaks or timeouts", icon: "📊", color: "general" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📊 UI/UX STRATEGY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "UI/UX STRATEGY",
      desc: "Implementation Plan Lines 255-264 • Ultra User-Friendly Design",
      icon: "🎨",
      color: "general",
      children: [
        { name: "Universal Access (Web + Mobile)", desc: "ALL roles get both web portal AND React Native app. Data syncs instantly", icon: "🌐", color: "general" },
        { name: "Role-Specific Dashboards", desc: "Clutter-free: Driver sees only Route/Map. Teacher sees only Attendance/Marks", icon: "📊", color: "general" },
        { name: "Language Toggle (Vernacular)", desc: "1-click switch to Hindi/regional language for Parents & Drivers", icon: "🌍", color: "general" },
        { name: "Icon-Driven Design", desc: "Minimal text, large clear icons. Calendar icon for leave, Rupee icon for fees", icon: "🎯", color: "general" },
        { name: "One-Click Actions", desc: "'Mark All Present' button, 'Remind All Unpaid Parents' — Save teacher/admin time", icon: "⚡", color: "general" },
        { name: "Touch Targets: 44×44px Minimum", desc: "All interactive elements meet accessibility standards for mobile", icon: "👆", color: "general" },
        { name: "PWA Support", desc: "manifest.json + Service Worker → 'Add to Home Screen' + offline caching + splash screen", icon: "📱", color: "general" }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💰 COST ESTIMATE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "COST ESTIMATE (Monthly)",
      desc: "Implementation Plan Lines 446-457",
      icon: "💰",
      color: "general",
      children: [
        { name: "Vercel Hosting", desc: "Free (hobby) → $20/mo (production)", icon: "▲", color: "general" },
        { name: "Supabase (DB)", desc: "Free (500MB) → $25/mo (production)", icon: "🐘", color: "general" },
        { name: "Cloudflare R2 (Files)", desc: "Free (10GB) → ~$5/mo", icon: "☁️", color: "general" },
        { name: "Gemini API (AI)", desc: "Free tier generous → ~$10-50/mo", icon: "🤖", color: "general" },
        { name: "Razorpay (Payments)", desc: "2% per transaction (no monthly fee)", icon: "💳", color: "general" },
        { name: "Resend (Email)", desc: "Free (100/day) → $20/mo", icon: "📧", color: "general" },
        { name: "Total Start: ~$0-5/mo", desc: "MVP can run entirely on free tiers", icon: "🆓", color: "general" },
        { name: "Total Production: ~$80-120/mo", desc: "Full production stack with all services", icon: "💎", color: "general" }
      ]
    }
  ]
};

// ── Color Palette ──
const COLORS = {
  master:      { bg: "#2d1b69", border: "#7c3aed", text: "#e9d5ff" },
  super_admin: { bg: "#1e3a5f", border: "#2563eb", text: "#bfdbfe" },
  teacher:     { bg: "#064e3b", border: "#059669", text: "#a7f3d0" },
  student:     { bg: "#164e63", border: "#0891b2", text: "#a5f3fc" },
  parent:      { bg: "#78350f", border: "#d97706", text: "#fde68a" },
  driver:      { bg: "#44403c", border: "#78716c", text: "#d6d3d1" },
  accountant:  { bg: "#7f1d1d", border: "#dc2626", text: "#fecaca" },
  general:     { bg: "#1f2937", border: "#6b7280", text: "#d1d5db" },
  edge:        { bg: "#450a0a", border: "#991b1b", text: "#fca5a5", dashed: true }
};

// ── Legend Data ──
const LEGEND = [
  { label: "Master Admin", color: "#7c3aed" },
  { label: "Super Admin (Principal)", color: "#2563eb" },
  { label: "Teacher", color: "#059669" },
  { label: "Student", color: "#0891b2" },
  { label: "Parent", color: "#d97706" },
  { label: "Driver / Conductor", color: "#78716c" },
  { label: "Accountant", color: "#dc2626" },
  { label: "⚠ Edge Case", color: "#991b1b", dashed: true }
];
