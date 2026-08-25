# Phased Execution Plan — School ERP Portal

> **Version:** 2.0 | **Status:** Final Draft
> **Total Duration:** 18 Weeks (4 Phases)
> **Methodology:** Component-Driven Development + TDD

---

## Phase 1: Foundation & Core MVP (Weeks 1-6)
*Goal: Get a single school operational with auth, academics, and teacher workflows.*

Source: Implementation Plan Lines 366-394

### Week 1-2: Project Setup & Authentication

**Task 1: Next.js Project Initialization**
- [ ] Initialize Next.js 14+ with App Router and TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Install and configure shadcn/ui component library
- [ ] Setup ESLint + Prettier for code quality
- [ ] Create `globals.css` with CSS variable theme system

**Task 2: Database Setup**
- [ ] Provision PostgreSQL database (Supabase or Neon.tech)
- [ ] Write complete `schema.prisma` with ALL 20 tables:
  - School, User (Foundation)
  - Class, SubjectMaster, Subject, ClassTeacher, TimetablePeriod, AcademicSchedule, Syllabus (Academic)
  - TeacherProfile, StudentProfile, ParentProfile, DriverProfile (Profiles)
  - Attendance, Exam, Result (Results)
  - Homework (Assignments)
  - Vehicle, Route (Transport)
  - FeeStructure, FeePayment, Expense (Finance)
  - Notice, LeaveApplication (Communication)
- [ ] Run `npx prisma migrate dev` to apply schema
- [ ] Seed database with 1 test school + 1 Master Admin user

**Task 3: Authentication (NextAuth.js v5)**
- [ ] Install and configure NextAuth.js v5 (Auth.js)
- [ ] Implement custom Credentials Provider
- [ ] Hash passwords with `bcryptjs` (cost factor 12)
- [ ] Write JWT callbacks to inject `role` and `schoolId` into token
- [ ] Define JWT payload: `{ sub, email, role, schoolId, isActive }`

**Task 4: Login/Register UI**
- [ ] Build `<LoginForm />` with premium UI (shadcn/ui Input, Button)
- [ ] Integrate `react-hook-form` + `zod` for client-side validation
- [ ] Email validation, password minimum 8 chars
- [ ] Error handling: Invalid credentials, account suspended

**Task 5: Role-Based Middleware & Route Protection**
- [ ] Create `middleware.ts` for Edge route protection
- [ ] Define route-role mapping:
  - `/master/*` → MASTER_ADMIN only
  - `/admin/*` → SUPER_ADMIN only
  - `/staff/*` → ADMIN_STAFF only
  - `/teacher/*` → TEACHER only
  - `/student/*` → STUDENT only
  - `/parent/*` → PARENT only
  - `/driver/*` → DRIVER only
  - `/accountant/*` → ACCOUNTANT only
- [ ] Unauthorized access → Redirect to `/login` or show 403
- [ ] Scaffold all 8 dashboard route groups under `(dashboard)/`

---

### Week 3-4: Super Admin (Principal) Panel

**Task 6: Super Admin Dashboard**
- [ ] Build dashboard page with school overview stats
- [ ] Widgets: Total Students, Total Teachers, Today's Attendance %, Today's Collection ₹
- [ ] Quick action buttons: "Broadcast Notice", "Generate Timetable"

**Task 7: Class Management (CRUD)**
- [ ] Build tRPC router: `class.ts` (create, getAll, update, delete)
- [ ] Build UI: `<ClassManagementTable />` with shadcn DataTable
- [ ] Pagination, sorting, search functionality
- [ ] Fields: name (e.g., "10th"), section (e.g., "A"), academicYear
- [ ] Unique constraint: [schoolId, name, section, academicYear]

**Task 8: Teacher Management & Class-Teacher Assignment**
- [ ] Build tRPC router: `user.ts` (create teacher, getBySchool)
- [ ] Build UI: `<AddTeacherForm />` (email, phone, empId, qualification)
- [ ] Auto-generate temporary password on creation
- [ ] Build `<ClassTeacherAssignment />` modal:
  - Select teacher → Select class → Select subject → is_class_teacher toggle
  - `assigned_by` auto-set to current Super Admin ID

**Task 9: Student Enrollment & Management**
- [ ] Build UI: `<StudentEnrollmentForm />` (name, class, roll number, parent linking)
- [ ] Auto-increment roll number per class
- [ ] Unique constraint: [classId, rollNumber]
- [ ] CSV Bulk Import: Parse CSV with `papaparse`, validate rows, insert batch

**Task 10: Parent Account Linking**
- [ ] Build UI to create parent accounts
- [ ] Link parent to student via `parentId` FK in StudentProfile
- [ ] Support multiple children per parent (1-to-many relationship)

**Task 10.5: Admission Panel (ADMIN_STAFF Front Office)**
- [ ] Build tRPC router: `admission.ts` (createEnquiry, getAll, updateStatus, uploadDocuments, confirmAdmission, searchSibling, unlinkSibling, generateWelcomeLetter)
- [ ] Build UI: Multi-step `<AdmissionWizard />` form:
  - Step 1: Student Details (name, DOB, gender, previous school)
  - Step 2: Parent Details (name, phone, email) + "Has Sibling?" checkbox
  - Step 3: Class Assignment (class, section, roll number)
  - Step 4: Document Upload (Birth Cert, Aadhaar, TC to R2)
  - Step 5: Review & Confirm → Auto-generate credentials
- [ ] Create `AdmissionEnquiry` Prisma model with status workflow: ENQUIRY → APPLIED → ADMITTED
- [ ] Sibling search: Query StudentProfile by parent phone or student name
- [ ] On confirm: Auto-create User (STUDENT) + StudentProfile + link/create ParentProfile
- [ ] Auto-generate credentials: Student username (STD{rollNo}@school), default password (DOB: DDMMYYYY)
- [ ] Welcome Letter PDF generation + upload to R2
- [ ] SMS dispatch: Send credentials to parent phone via MSG91
- [ ] Sibling Management view: Table with Link/Unlink actions
- [ ] Edge case: Unlink Sibling → Create fresh parent account
- [ ] Edge case: Divorce/separated → Support 2 guardian accounts

**Task 11: Notice Board**
- [ ] Build tRPC router: `notice.ts` (create, getForUser)
- [ ] Build UI: Rich text editor (TipTap) for notice body
- [ ] Target by role: JSON array of roles (["TEACHER", "PARENT"])
- [ ] Target by class: JSON array of class IDs
- [ ] Schedule for future date: `publishDate` field
- [ ] Draft vs Published toggle: `isPublished` boolean
- [ ] File attachments upload to R2

**Task 12: Academic Schedule / Calendar**
- [ ] Build AcademicSchedule CRUD
- [ ] Types: EXAM | HOLIDAY | EVENT
- [ ] Calendar view for upcoming events

**Task 13: AI Timetable Generator (Basic Version)**
- [ ] Build `src/lib/ai/timetable-generator.ts`
- [ ] Input: All teachers, subjects, classes, constraints (day, time, room)
- [ ] Algorithm: Constraint satisfaction logic + Gemini API optimization
- [ ] Output: Conflict-free weekly timetable
- [ ] Store results in TimetablePeriod table with `isAiGenerated = true`
- [ ] Manual drag-drop override UI for fine-tuning

---

### Week 5-6: Teacher Panel

**Task 14: Teacher Dashboard**
- [ ] Build mobile-first teacher dashboard
- [ ] Today's schedule timeline: which class at which time
- [ ] Action cards based on time of day
- [ ] Bottom tab navigation (Home, Classes, Messages, Profile)

**Task 15: Attendance Marking (Offline-First)**
- [ ] Build tRPC router: `attendance.ts` (markBulk, getForClassDate, getStudentStats)
- [ ] Build UI: `<AttendancePhotoGrid />` — student photos in grid
- [ ] Default all to PRESENT (green), tap to mark ABSENT (red)
- [ ] "Mark All Present" one-click button
- [ ] **Offline-First Implementation:**
  - [ ] Configure Service Worker for PWA caching
  - [ ] Install Dexie.js for IndexedDB
  - [ ] Create `ERPSyncDB` with `syncQueue` table
  - [ ] When offline: Save mutation to IndexedDB
  - [ ] Show toast: "Saved Offline. Will sync when connected."
  - [ ] On `window 'online'` event: Process queue
  - [ ] Conflict resolution: Last-Write-Wins via `syncedAt` timestamp
  - [ ] Unique constraint: [studentId, date] prevents duplicates

**Task 16: Homework Creation & Management**
- [ ] Build tRPC router for homework CRUD
- [ ] Build UI: `<HomeworkForm />` (title, description, dueDate, subject, class)
- [ ] File attachment upload to Cloudflare R2 via pre-signed URLs
- [ ] Homework list view for teacher

**Task 17: Result/Marks Upload**
- [ ] Build Exam creation UI (name, class, subject, date, totalMarks, passingMarks, type)
- [ ] Build Marks upload UI: Table with student names, input for marks
- [ ] Auto-calculate grade based on school's grading scale
- [ ] Store in Result table (marksObtained, grade, remarks)

**Task 18: Leave Application System**
- [ ] Build tRPC router: `leave.ts` (apply, approve, reject, getSubstituteSuggestion)
- [ ] Build UI: `<LeaveApplicationForm />` (leaveType: SICK|CASUAL|PERSONAL, fromDate, toDate, reason)
- [ ] Status tracking: PENDING → APPROVED / REJECTED
- [ ] `approvedBy` field records who approved/rejected

**Task 19: AI Leave Substitute Suggestion**
- [ ] Build `src/lib/ai/leave-suggester.ts`
- [ ] When teacher applies leave: Scan timetable for affected periods
- [ ] Find free teachers during those periods
- [ ] Prefer same-subject teachers
- [ ] Consider workload balancing
- [ ] Store suggestion in `aiSubstituteSuggestion` JSON field
- [ ] Show suggestions to Super Admin for final decision

**Task 20: Class Schedule View**
- [ ] Build read-only timetable view for teacher
- [ ] Shows only the teacher's assigned periods
- [ ] Weekly grid format (Day x Time)

---

## Phase 2: Student, Parent & Support Roles (Weeks 7-10)
*Goal: Open platform to end-users and integrate financial operations.*

Source: Implementation Plan Lines 397-417

### Week 7-8: Student Portal

**Task 21: Student Dashboard with Profile**
- [ ] Build student dashboard page
- [ ] Profile card: photo, name, class, section, roll number
- [ ] Quick stats: Attendance %, Pending Homework, Next Exam

**Task 22: Attendance View with Calendar**
- [ ] Color-coded monthly calendar (green/red/yellow)
- [ ] List of absent days with leave status
- [ ] Overall attendance percentage
- [ ] Monthly attendance percentage

**Task 23: Results & Report Cards**
- [ ] Subject-wise marks table for each exam
- [ ] Progress trends chart (improvement/decline over time)
- [ ] Download Report Card as PDF

**Task 24: Homework List & Submission**
- [ ] Homework list sorted by due date
- [ ] View attachment files
- [ ] Submission tracking (done/pending)

**Task 25: Timetable View**
- [ ] Weekly grid view of student's class schedule

**Task 26: Notice Board View**
- [ ] List of notices targeted to STUDENT role or student's class
- [ ] Read/unread tracking

**Task 27: Transportation Details**
- [ ] View assigned bus number, route name
- [ ] Stop list with timings
- [ ] Driver contact information

**Task 28: Student Leave Application**
- [ ] Apply for leave online (pre-inform school)
- [ ] Leave types: SICK, CASUAL, PERSONAL
- [ ] Status tracker: PENDING → PARENT_APPROVED → SCHOOL_APPROVED
- [ ] Multi-step: Student applies → Parent approves → School approves

---

### Week 9-10: Parent Portal, Support Roles & Mobile Foundations

**Task 29: Parent Dashboard (Child-Centric View)**
- [ ] Child selector: If parent has multiple children, show horizontal scroll
- [ ] Quick summary: Attendance %, Pending Fees, Last Exam Marks
- [ ] Notification bell: Fee reminders, notice alerts, leave updates
- [ ] Edge case: "No Child Linked" → Show setup wizard

**Task 30: Student Leave Application from Parent Side**
- [ ] View child's leave applications
- [ ] Approve / Reject child's leave
- [ ] Warning if leave overlaps with scheduled exam

**Task 31: All Child Information Access**
- [ ] View child's attendance calendar
- [ ] View child's marks and progress trends
- [ ] View child's homework list
- [ ] View syllabus progress (% completed per subject)

**Task 32: Fee Payment Integration (Razorpay)**
- [ ] Build tRPC router: `fee.ts` (createStructure, getStudentDues, initiatePayment, recordOffline)
- [ ] View fee dues with detailed breakdown (Tuition, Transport, Library, Sports)
- [ ] Online payment via Razorpay (UPI, Card, NetBanking)
- [ ] Edge case: Payment failure → Allow retry without double charge

**Task 33: Online Receipt Generation & Download**
- [ ] Auto-generate receipt on successful payment
- [ ] PDF generation library (`@react-pdf/renderer` or `jspdf`)
- [ ] Upload PDF to R2, store URL in `onlineReceiptUrl`
- [ ] "Download Receipt" button in payment history

**Task 34: Transportation Tracking (Parent)**
- [ ] View child's route, stops, timings
- [ ] Driver details: name, phone, license number
- [ ] Edge case: Route changed without notice → Alert parent

**Task 35: Driver / Conductor Panel (Mobile-Friendly UI)**
- [ ] Profile management: personal details, license number & validity, emergency contact
- [ ] Route details: assigned route, stop list, timings, student list
- [ ] Vehicle status: bus number, capacity, fitness certificate
- [ ] Edge cases: License expired → Alert, No route assigned → "Contact Admin"
- [ ] Ultra-minimal dark mode UI with massive touch targets

**Task 36: Account Office (Accountant) Panel**
- [ ] Fee collection dashboard: Today's collections, pending dues overview
- [ ] Class-wise collection summary
- [ ] Receipt generation: Online auto + Offline manual
- [ ] Bulk receipt printing for date range
- [ ] Expense management: Add expense (category, amount, date, receipt upload)
- [ ] Approval workflow: Expenses above threshold need Principal approval
- [ ] SmartCollect reconciliation view: Matched vs Unmatched payments
- [ ] Financial reports: Income vs Expense, Monthly Statement, Tax-ready Export
- [ ] Audit trail log: Immutable record of all financial transactions
- [ ] Edge cases: Manual entry mismatch, duplicate receipt number

**Task 37: React Native Expo Setup**
- [ ] Initialize React Native (Expo) project
- [ ] Setup shared API client (same tRPC endpoints)
- [ ] Build Student/Parent mobile app foundations
- [ ] Cross-platform authentication flow

---

## Phase 3: AI Enhancement & Polish (Weeks 11-14)
*Goal: Implement all AI features and make the platform production-ready.*

Source: Implementation Plan Lines 421-431

**Task 38: Advanced AI Timetable Optimization**
- [ ] Improve constraint satisfaction algorithm
- [ ] Handle edge cases: Teacher teaches same subject in multiple classes
- [ ] Room capacity constraints
- [ ] Preferred time slots per teacher

**Task 39: Performance Analytics & Prediction**
- [ ] Student performance dashboard for Super Admin
- [ ] Class-wise average marks comparison
- [ ] Subject-wise pass/fail rates

**Task 40: Smart Notifications System**
- [ ] Push notifications via Pusher/Socket.io
- [ ] Real-time updates: Fee paid, Leave approved, New notice
- [ ] Bell icon with unread count badge

**Task 41: AI-Powered Report Card Generation**
- [ ] Build behavioral tagging UI for teachers
- [ ] Predefined tags: "Leadership", "Helpful", "Distracted", "Creative Problem Solver", etc.
- [ ] Teachers assign tags throughout the year
- [ ] AI (Gemini) analyzes tags + marks → Generates Professional Narrative Report
- [ ] 2-3 paragraph personality + academic summary per student
- [ ] Store narrative in Result table

**Task 42: Attendance Anomaly Alerts (AI At-Risk)**
- [ ] Background cron job: Weekly analysis
- [ ] AI monitors: Attendance drops, homework completion, test marks
- [ ] If sudden decline detected → "Early Warning Alert" to Principal/Counselor
- [ ] Alert dashboard with student details and recommended intervention

**Task 43: Mobile Responsive Optimization**
- [ ] Audit all 7 dashboards for mobile responsiveness
- [ ] Teacher, Student, Parent, Driver → Must work perfectly on 360px width
- [ ] Touch targets: Minimum 44x44px

**Task 44: PWA (Progressive Web App) Setup**
- [ ] Create `manifest.json` with app name, icons, theme color
- [ ] Configure Service Worker for offline caching
- [ ] Enable "Add to Home Screen" for mobile users
- [ ] Splash screen with school logo

**Task 45: Email / SMS Notification System**
- [ ] Integrate Resend API for email (welcome emails, password resets)
- [ ] Integrate MSG91/Twilio for DLT-approved transactional SMS
- [ ] Sender ID: SCH-ERP
- [ ] SMS templates: Fee reminder, Absent alert, Leave status, Emergency notice
- [ ] Bulk SMS for notices targeted at parents

---

## Phase 4: Multi-Tenant SaaS (Weeks 15-18)
*Goal: Convert single-school MVP into scalable multi-tenant SaaS platform.*

Source: Implementation Plan Lines 434-443

**Task 46: Master Admin Panel for Managing Multiple Schools**
- [ ] Global dashboard: Total schools, Total users, Revenue
- [ ] School listing with search, filter (Active/Suspended/Trial)
- [ ] School detail view with analytics
- [ ] System health monitoring

**Task 47: School Onboarding Flow**
- [ ] 1-click provisioning wizard
- [ ] Auto-create School row with default settings
- [ ] Auto-create Super Admin account with temporary password
- [ ] Send welcome email with login credentials

**Task 48: Subscription/Pricing Management**
- [ ] Define plans: FREE, BASIC, PREMIUM
- [ ] Feature flags based on plan (e.g., AI features = PREMIUM only)
- [ ] Billing integration (Stripe or Razorpay Subscriptions)
- [ ] Plan upgrade/downgrade flow

**Task 49: School-Specific Customization**
- [ ] Logo upload (stored in R2)
- [ ] Primary color picker → Updates CSS variables dynamically
- [ ] School name displayed throughout their portal
- [ ] Custom grading scale configuration

**Task 50: Data Isolation Between Schools**
- [ ] Verify all tRPC queries include `schoolId` filter
- [ ] Security audit: Attempt to access School B data with School A token
- [ ] Implement Prisma Client Extension or RLS policies
- [ ] Cascade delete: Deleting school removes all its data

**Task 51: Landing Page for Marketing**
- [ ] Build marketing landing page at root `/`
- [ ] Highlight AI features, offline capabilities, pricing
- [ ] Responsive design with modern animations
- [ ] Contact form / Demo request form

**Task 52: Payment Gateway for Subscriptions**
- [ ] Schools pay the platform (B2B billing)
- [ ] Stripe/Razorpay recurring subscription setup
- [ ] Invoice generation for schools
- [ ] Grace period handling for failed payments

---

## Verification & Testing Plan

Source: Implementation Plan Lines 496-508

### Automated Tests
- [ ] Unit tests for all tRPC routers (Jest/Vitest)
- [ ] E2E tests for critical flows (Playwright):
  - Login as each role → Verify correct dashboard loads
  - Teacher marks attendance offline → Verify sync on reconnect
  - Parent pays fee → Verify auto-reconciliation
- [ ] `npm run build` compilation check (TypeScript strict)

### Manual Verification
- [ ] Login as each of the 8 roles → Verify all features accessible
- [ ] Payment gateway sandbox testing (Razorpay test mode)
- [ ] AI feature accuracy testing (Gemini output quality review)
- [ ] Mobile responsiveness check (Chrome DevTools + real devices)
- [ ] Load testing for concurrent users (k6/Artillery — simulate 1000 users)
