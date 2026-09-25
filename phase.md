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
- [x] Initialize Next.js 14+ with App Router and TypeScript
- [x] Install and configure Tailwind CSS
- [x] Install and configure shadcn/ui component library
- [x] Setup ESLint + Prettier for code quality
- [x] Create `globals.css` with CSS variable theme system

**Task 2: Database Setup**
- [x] Provision PostgreSQL database (Supabase or Neon.tech)
- [x] Write complete `schema.prisma` with ALL 20 tables:
  - School, User (Foundation)
  - Class, SubjectMaster, Subject, ClassTeacher, TimetablePeriod, AcademicSchedule, Syllabus (Academic)
  - TeacherProfile, StudentProfile, ParentProfile, TransportStaff (Profiles)
  - Attendance, Exam, Result (Results)
  - Homework (Assignments)
  - Vehicle, Route (Transport)
  - FeeStructure, FeePayment, Expense (Finance)
  - Notice, LeaveApplication (Communication)
- [x] Run `npx prisma migrate dev` to apply schema
- [x] Seed database with 1 test school + 1 Master Admin user

**Task 3: Authentication (NextAuth.js v5)**
- [x] Install and configure NextAuth.js v5 (Auth.js)
- [x] Implement custom Credentials Provider
- [x] Hash passwords with `bcryptjs` (cost factor 12)
- [x] Write JWT callbacks to inject `role` and `schoolId` into token
- [x] Define JWT payload: `{ sub, email, role, schoolId, isActive }`

**Task 4: Login/Register UI**
- [x] Build `<LoginForm />` with premium UI (shadcn/ui Input, Button)
- [x] Integrate `react-hook-form` + `zod` for client-side validation
- [x] Email validation, password minimum 8 chars
- [x] Error handling: Invalid credentials, account suspended

**Task 5: Role-Based Middleware & Route Protection**
- [x] Create `middleware.ts` for Edge route protection
- [x] Define route-role mapping:
  - `/master/*` → MASTER_ADMIN only
  - `/admin/*` → SUPER_ADMIN only
  - `/staff/*` → ADMIN_STAFF only
  - `/teacher/*` → TEACHER only
  - `/student/*` → STUDENT only
  - `/parent/*` → PARENT only
  - `/librarian/*` → LIBRARIAN only
  - `/store/*` → STORE_MANAGER only
  - `/accountant/*` → ACCOUNTANT only
- [x] Unauthorized access → Redirect to `/login` or show 403
- [ ] Scaffold all 9 dashboard route groups under `(dashboard)/`

**Task 5.1: Next.js Performance & Stability Setup**
- [x] Implement Cache Busting patterns: `revalidatePath` and `revalidateTag` in tRPC mutations
- [x] Enforce Component Boundaries: Layouts/Pages as Server Components, interactive UI as Client Components (`"use client"`)
- [x] Set `export const dynamic = 'force-dynamic'` for real-time dashboards to prevent stale data bugs
- [x] Ensure Cloud-Agnostic architecture (Standard Next.js APIs, no proprietary Vercel hooks)

---

### Week 3-4: Super Admin (Principal) Panel

**Task 6: Super Admin Dashboard**
- [x] Build dashboard page with school overview stats
- [x] Widgets: Total Students, Total Teachers, Today's Attendance %, Today's Collection ₹
- [x] Quick action buttons: "Broadcast Notice", "Generate Timetable"

**Task 7: Class Management (CRUD)**
- [x] Build tRPC router: `class.ts` (create, getAll, update, delete)
- [x] Build UI: `<ClassManagementTable />` with shadcn DataTable
- [x] Pagination, sorting, search functionality
- [x] Fields: name (e.g., "10th"), section (e.g., "A"), sessionId (Linked to Academic Session Master)
- [x] Unique constraint: [schoolId, name, section, sessionId]
- [x] **v4.0 Feature**: Implement `AcademicSession` master table to strictly control active/past terms.

**Task 8: Teacher Management & Class-Teacher Assignment**
- [x] Build tRPC router: `user.ts` (create teacher, getBySchool)
- [x] Build UI: `<AddTeacherForm />` (email, phone, empId, qualification)
- [x] Auto-generate temporary password on creation
- [x] Build `<ClassTeacherAssignment />` modal:
  - Select teacher → Select class → Select subject → is_class_teacher toggle
  - `assigned_by` auto-set to current Super Admin ID

**Task 9: Student Enrollment & Management**
- [x] Build UI: `<StudentEnrollmentForm />` (name, class, roll number, parent linking)
- [x] Auto-increment roll number per class
- [x] Unique constraint: [classId, rollNumber]
- [x] CSV Bulk Import: Parse CSV with `papaparse`, validate rows, insert batch
- [x] **v4.0 Feature**: Implement `StudentStatus` enum (`ALUMNI`, `DROPOUT`, `EXPELLED`) for proper lifecycle tracking instead of just inactive.
- [x] **v4.0 Feature**: Integrate `Custom Fields (JSONB)` engine to allow dynamic data collection on the enrollment form.

**Task 10: Parent Account Linking**
- [x] Build UI to create parent accounts
- [x] Link parent to student via `parentId` FK in StudentProfile
- [x] Support multiple children per parent (1-to-many relationship)

**Task 10.5: Omni-Channel Admission Panel (ADMIN_STAFF)**
- [x] Build tRPC router: `admission.ts` (createEnquiry, createQrEnquiry, bulkImport, getAll, updateStatus, uploadDocuments, confirmAdmission, searchSibling, unlinkSibling, collectFee)
- [x] Create `AdmissionEnquiry` Prisma model with `AdmissionSource` and `AdmissionFeeStatus` enums
- [x] **Pillar 1: High-Speed Data Entry Mode**
  - Build single-page, scrollable `<HighSpeedAdmissionForm />`
  - Keyboard-only `Tab` navigation & smart defaults (date/session)
  - Instant sibling auto-fill based on parent phone (no search button)
  - Optional document upload (`documentsPending = true`)
  - Instant fee collection component (Full/Partial/Waiver)
  - Auto-submit and form reset on `Enter`
- [x] **Pillar 2: QR Code Self-Serve**
  - Build public route `/apply?schoolId=xxx` for mobile QR scanning
  - Build "Pending Enquiries" real-time dashboard widget for Staff using Pusher
- [x] **Pillar 3: Bulk CSV Import**
  - Build `downloadTemplate` endpoint for `.xlsx`
  - Build `<BulkImportDropzone />` with Papaparse CSV validation
  - Auto-create all Users/Profiles + sibling phone matching logic
- [x] **Missing Documents & Edge Cases**
  - Build "Missing Documents" dashboard widget
  - Divorce/separated edge case: Support 2 guardian accounts
  - Sibling Unlink: Create fresh parent account logic

**Task 10.6: Front Office CRM & Operations (v4.0 Feature)**
- [x] Build tRPC router: `frontOffice.ts`
- [x] Build UI for Receptionist (`/staff` panel)
- [x] Implement `VisitorLog` (Tracking purpose, time-in, time-out)
- [x] Implement `CallLog` (Phone call follow-ups and inquiries)
- [x] Implement `Complaint` management (Parent complaints with Open/Resolved status tracking)

**Task 11: Notice Board**
- [x] Build tRPC router: `notice.ts` (create, getForUser)
- [x] Build UI: Rich text editor (TipTap) for notice body
- [x] Target by role: JSON array of roles (["TEACHER", "PARENT"])
- [x] Target by class: JSON array of class IDs
- [x] Schedule for future date: `publishDate` field
- [x] Draft vs Published toggle: `isPublished` boolean
- [x] File attachments upload to R2

**Task 12: Academic Schedule / Calendar**
- [x] Build AcademicSchedule CRUD
- [x] Types: EXAM | HOLIDAY | EVENT
- [x] Calendar view for upcoming events
- [x] Google Calendar style mobile-first interactive UI
- [x] Multi-day event support

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
- [ ] Build `updateMarksInline` mutation for fast cell-based UI editing.
- [ ] Build `downloadMarksTemplate` and `uploadMarksExcel` for offline bulk entry.
- [ ] Build UI: `<MarksEntryGrid />` acting like an Excel sheet (Arrow key navigation).
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
- [ ] Transport staff contact information

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
- [ ] Build UI mapping the JSON stops array on a route to a visual timeline
- [ ] Parent view logic: Filter transport staff data to ONLY show `Name`, `Phone`, and `Bus Number`
- [ ] Emergency protocol: Add a "Call Transport Staff" direct 1-tap action button
- [ ] Edge case: Route/Bus changed temporarily → Push Notification alert to parent
- [ ] **v4.0 Feature**: Implement `PickupPoint` model. Move transport billing logic beyond generic routes to distance-based PickupPoint billing.

**Task 35: Transport Staff Management (Admin Only)**
- [ ] Build tRPC router: `transport.ts` (Manage Vehicles, Routes, TransportStaff)
- [ ] Create `<TransportStaffForm />` for Admin to input private HR data (License Number, Aadhar Number, Experience Years, Police Verification Status)
- [ ] Ensure `TransportStaff` is strictly an administrative model (No User/Login relations created)
- [ ] Build `<RouteBuilder />`: Admin assigns a `Vehicle`, `DRIVER` and `CONDUCTOR` (internal tags) to a single Route
- [ ] Background Cron Job logic: Daily check on `licenseExpiryDate` and `fitnessCertificateExpiryDate`
- [ ] Admin Dashboard Alerts Widget: "⚠️ 2 Staff Licenses expiring this month"

**Task 36: Account Office (Accountant) Panel**
- [ ] Fee collection dashboard: Today's collections, pending dues overview
- [ ] Class-wise collection summary
- [ ] Receipt generation: Online auto + Offline manual
- [ ] Bulk receipt printing for date range
- [ ] SmartCollect reconciliation view: Matched vs Unmatched payments
- [ ] **v4.0 Feature**: Implement `AccountHead` ledger (True double-entry style tracking for Income/Expense).
- [ ] **v4.0 Feature**: Implement `FeeArrear` (Carry Forward) tracking unpaid dues cascading across Academic Sessions.
- [ ] Financial reports: Income vs Expense, Monthly Statement, Tax-ready Export, Balance Sheet
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
- [ ] Teacher, Student, Parent → Must work perfectly on 360px width
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

## Phase 4: White-Label Agency Deployment (Weeks 15-18)
*Goal: Convert the single-school MVP into a scalable White-Label Master Codebase for dedicated client deployments.*

Source: Implementation Plan Lines 434-443

**Task 46: Master Admin Agency Panel**
- [ ] Global dashboard for the Agency Owner: Total clients (schools), Active Subscriptions, Monthly Recurring Revenue (MRR)
- [ ] Client (School) listing with search and filter capabilities (Active, Suspended, Trial)
- [ ] Feature toggle interface: Master Admin can enable/disable specific modules for specific schools remotely
- [ ] **v4.0 Feature**: `modulesEnabled` JSON on `School` to remotely turn off features like Hostel or Transport for base-tier subscribers.
- [ ] **v4.0 Feature**: Global System `AuditLog` UI capturing sensitive writes (e.g., modifying marks, deleting receipts) across all tenant schools.

**Task 47: Client Onboarding & Provisioning Flow**
- [ ] Automated provisioning script: Spins up a dedicated Vercel project and Neon/Railway database automatically
- [ ] Injects `NEXT_PUBLIC_*` environment variables instantly
- [ ] Auto-creates the Super Admin account for the school Principal and dispatches a welcome email

**Task 48: Subscription-Based Feature Gating**
- [ ] Implement robust `subscriptionPlan` logic in the database (Base, Pro, Premium)
- [ ] Wrap premium tRPC endpoints (e.g. AI Timetable, Payroll) with a custom middleware that checks subscription status
- [ ] Frontend UI component wrapper `<PremiumGated>`: Renders children if Premium, else renders an "Upgrade Required" lock overlay
- [ ] Plan upgrade/downgrade flows with Razorpay B2B subscriptions

**Task 49: Deep Client Customization (White-Labeling)**
- [ ] Admin interface to upload School Logo (persists to R2 bucket, updates Env var)
- [ ] Color picker for Primary and Secondary theme colors → dynamically updates CSS variables globally
- [ ] Custom grading scales and SMS provider keys configured per client instance

**Task 50: Deployment Isolation Validation**
- [ ] Setup strict CI/CD pipeline ensuring the Master Codebase pushes cleanly to all connected Vercel instances
- [ ] Security audit: Validate that cross-database leakage is impossible since each client uses isolated connection strings
- [ ] Network routing validation: Ensure `dps.schoolerp.com` strictly routes to the correct isolated deployment

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

## Phase 2: Enterprise Modules (Weeks 9-11)

### Week 2: Role Management & Base UI
**Task 9: Advanced UI Elements & Optimization**
- [ ] Implement Shadcn custom theme.
- [ ] Add Framer Motion for micro-interactions (hover effects, modal springs).
- [ ] Add Client-side automated Image Compression to `WebP` (browser-image-compression) for all upload modules.
- [ ] Build `<LibrarianDashboard />` with fast Barcode Issue/Return queue.
- [ ] Implement overdue fine calculation cron/logic.
- [ ] Link unpaid library fines to student fee dues.

**Task 54: Inventory & POS Billing**
- [ ] Build `inventory.ts` router (item variants, stock decrements, checkout).
- [ ] Build `<StoreManagerDashboard />` POS counter UI.
- [ ] Integrate Razorpay Dynamic QR + Cash flow for checkout.
- [ ] Build 80mm ESC/POS Thermal Receipt print layout.

### Week 10: HR & Payroll
**Task 55: Payroll Execution & Advanced HR Engine**
- [ ] Build `payroll.ts` router.
- [ ] Sync `TeacherAttendance` & `LeaveApplications` into payable days calculation.
- [ ] Build `<AccountantPayrollView />` for bulk 1-Click calculation.
- [ ] Generate individual PDF Payslips and NACH bank export CSV.
- [ ] **v4.0 Feature**: Implement Unified `StaffProfile` (combining Teacher, Librarian, Accountant under one umbrella).
- [ ] **v4.0 Feature**: Implement `Department` and `Designation` tracking for unified HR structure.

### Week 11: Documents & Report Cards
**Task 56: 1-Click Certificate Generator & Builder**
- [ ] Build `certificate.ts` (TC, Bonafide generation).
- [ ] Add secure QR Hash verification logic.
- [ ] **v4.0 Feature**: Build `DocumentTemplate` JSON engine to drag-and-drop design TCs, ID Cards, and Marksheets dynamically.
- [ ] **v4.0 Feature**: Implement `DocumentPrintLog` to track duplicate printing of sensitive documents silently.
- [ ] **v4.0 Feature**: Implement `TC Override Bypass` allowing Super Admin to bypass Fee Arrear lockouts and force-generate Transfer Certificates.

**Task 57: Report Card Designer**
- [ ] Build `reportCard.ts` for grading logic.
- [ ] Create Drag & Drop Report Card layout builder for Super Admin.
- [ ] Integrate Gemini API for personalized 2-line student remarks.
- [ ] Build bulk PDF generation engine for full class printing.

**Task 58: Govt & CBSE Compliance Export**
- [ ] Build `compliance.ts` router.
- [ ] Aggregation logic for Student Demographics (Gender/Category) and PTR.
- [ ] UI for Super Admin Compliance Dashboard (1-click export button).
- [ ] Implement Excel/CSV generation matching U-DISE+ / OASIS standard layout.

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
- [ ] Login as each of the 9 roles → Verify all features accessible
- [ ] Payment gateway sandbox testing (Razorpay test mode)
- [ ] AI feature accuracy testing (Gemini output quality review)
- [ ] Mobile responsiveness check (Chrome DevTools + real devices)
- [ ] Load testing for concurrent users (k6/Artillery — simulate 1000 users)

## [v2.0 SaaS Architecture Upgrades]
This document has been upgraded with the following SaaS features:
1. **ERPVyapar Rebranding**: The platform is now named ERPVyapar.
2. **Multi-School Login Logic**: Users belonging to multiple schools will be prompted with a "Select School" box upon logging in.
3. **Dedicated School Login Panels**: Generic login is deprecated. Each school has dedicated URLs (`/school/[slug]/staff-login` and `/school/[slug]/student-login`).
4. **Custom Domains**: Schools can attach custom domains (e.g., `gmacademy.com`) stored in the `customDomain` field, routed dynamically via Next.js middleware.
5. **Custom Roles (RBAC)**: The hardcoded Role enum is replaced by a dynamic `SystemRole` table allowing Super Admins to create customized roles combining multiple permissions (e.g., Admissions + Transport).
6. **Master Admin Portal**: The developer/agency portal is strictly isolated at a secret `/hq` route. Master Admins cannot use school login pages.

## [v3.0 Timetable & Teacher Enrollment Architecture]
This document has been updated with the following architectural decisions for Teacher & Timetable Modules:
1. **Teacher Enrollment**: Supports 3 modes: (A) QR-Based Self-Onboarding via public form, (B) Bulk Excel Import for onboarding 50+ staff instantly, (C) Manual Admin Entry.
2. **Teacher Preferences**: During enrollment, the system captures Max Periods/Week, Core Subjects, and Eligible Classes to define algorithmic limits.
3. **Smart Excel Master Import**: Admin can download a pre-filled Excel template (with dropdowns), fill out the manual timetable, and upload it to auto-create `ClassTeacher` mappings and `TimetablePeriod` rows instantly.
4. **Auto-Generate Timetable**: A single-click feature that processes the *entire* school at once using advanced algorithms (e.g., Genetic Algorithms) to prevent local minima and avoid conflicts for shared resources (PT/Computer teachers).
5. **Smart Typing Grid**: A keyboard-first dynamic UI for manual timetable entry where typing a teacher's name auto-suggests available teachers and highlights conflicts instantly.
6. **Drag-and-Drop Swapping**: To tweak a fully generated timetable, dragging one assigned period onto another will cleanly *Swap* them without destroying the class subject balance.
7. **Teacher Replacement & Proxies**: Built-in edge-case handling for mid-session teacher resignations (one-click transfer of all periods) and leave proxies (suggesting available teachers for a specific day/period).

