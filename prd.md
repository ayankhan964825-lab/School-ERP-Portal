# Product Requirements Document (PRD) — School ERP Portal

> **Version:** 2.0 | **Status:** Final Draft
> **Product Type:** Multi-Tenant SaaS Platform
> **Target Market:** Tier-2 & Tier-3 Indian Schools

---

## 1. Product Vision & Overview

Ek **production-ready, White-Label School ERP Platform** banana hai jo AI-powered features ke saath existing market solutions (Teachmint, Fedena, Vidyalaya) se behtar ho.

**Approach & Agency Model:**
Pehle **Phase 1 mein ek Master Codebase** banayenge jo highly generalized, modular aur scalable hoga. Iske baad, jab bhi koi naya school (client) onboard hoga:
1. **Dedicated Deployment:** Hum uss school ke liye ek alag Vercel/Railway deployment spin up karenge. Data totally isolated hoga (Single-Tenant approach).
2. **Instant White-Labeling:** Environment variables (`NEXT_PUBLIC_SCHOOL_NAME`, `NEXT_PUBLIC_THEME_COLOR`, `NEXT_PUBLIC_LOGO_URL`) ka use karke uss deployment ko instantly uss school ki branding (logo, colors, name) de di jayegi.
3. **Play Store App:** Unke school ke naam se ek dedicated Android app publish kiya jayega jo parent aur marketing ke liye ek premium feel dega.
4. **Centralized Maintenance:** Agency owner ke paas ek Master Admin panel hoga jahan se woh alag-alag schools ke subscription plans (Base, Pro, Premium) control karega, features ko toggle (enable/disable) karega, aur central codebase se updates push karega.
Yeh model data security badhata hai aur client ko ek "Personal App" hone ka feel deta hai.

**Core Differentiators:**
1. AI-Powered Intelligence (Google Gemini) — Timetabling, Report Generation, At-Risk Alerts
2. True Offline-First Architecture — Flutter Mobile App uses C++ based Isar/ObjectBox DB, letting teachers work with zero internet latency.
3. Auto Fee Reconciliation — Razorpay SmartCollect, zero manual entry
4. Consumer-Grade Premium UI — shadcn/ui + Tailwind CSS
5. Universal Access — Next.js Web + Flutter Mobile App dono available for ALL roles
6. Astro-Grade Next.js Performance — Cache-busting (`revalidatePath`), Server/Client strict boundaries, and Edge Routing ensuring zero stale data and instant load times.
7. Enterprise Data Retention (Soft Deletion) — No schools or users are ever hard-deleted. Financial records are preserved forever using `status` flags (Active/Suspended/Deleted).
8. Agency White-Labeling (Media Proxy) — The platform completely masks the underlying Cloudflare/Supabase architecture via a `/api/media` reverse proxy.
9. Strict Mobile-First UI — Flawless responsiveness across Mobile, Tablet, iPad, and Windows Desktop via enforced Tailwind CSS breakpoints, preventing broken layouts on scaling.

---

## 2. Target Users & Role-Based Access Control (RBAC)

System mein **9 distinct user roles** hain. Har role ka apna isolated dashboard hai. Ek role doosre role ka data access nahi kar sakta.

### 2.1 MASTER_ADMIN (Developer — Platform Owner)

**Profile:** SaaS platform ka owner/developer. Saare schools ko manage karta hai.

**Exact Permissions (from implementation plan line 194-199):**
1. Create/Manage Schools (new tenant onboarding)
2. Assign Super Admins to each school
3. View all schools' analytics (cross-tenant global dashboard)
4. Manage subscriptions (Free, Basic, Premium plans)
5. System-wide settings (API rate limits, feature flags)

**Dashboard Features:**
- Global analytics: Total schools, total users, total revenue
- School listing with search/filter (Active, Suspended, Trial)
- 1-click school provisioning wizard
- Subscription billing management interface
- System health monitoring (API response times, error rates)

---

### 2.2 SUPER_ADMIN (Principal — School Owner)

**Profile:** School ka apex authority. Apne school ka poora academic, financial, aur administrative setup karta hai.

**Exact Permissions (from implementation plan line 201-209):**
1. Full school access (all modules within their tenant)
2. Assign all roles (create Teacher, Student, Parent, Admin Staff, Librarian, Store Manager, Accountant accounts)
3. Class-Teacher mapping (assign teachers to specific classes and subjects)
4. Publish notices & Define Syllabus
5. Academic schedule management (exams, holidays, events calendar)
6. View all reports (attendance, marks, financial, behavioral)
7. Fee structure setup (define fee types, amounts, due dates)
8. Transportation management (vehicles, routes, transport staff)

**Dashboard Features:**
- School overview stats (Total Students, Total Teachers, Today's Attendance %)
- Today's Collection amount (online + offline)
- Pending leaves for approval
- AI-generated alerts (At-Risk students, Syllabus lagging)
- Quick actions: "Broadcast Notice", "Generate AI Timetable"

---

### 2.3 TEACHER

**Profile:** Academic executor. Daily classroom operations run karta hai.

**Exact Permissions (from implementation plan line 211-218):**
1. Own classes' attendance (mark attendance for assigned classes ONLY)
2. Upload results/homework (for assigned subjects ONLY)
3. Update Syllabus Progress (check off completed topics)
4. View own schedule (timetable view)
5. Apply for leave (with AI substitute suggestion)
6. View student profiles (assigned classes only — NOT other classes)
7. Cannot modify other teachers' data

**Dashboard Features:**
- Today's Schedule Timeline (which class at which time)
- Action cards: "Mark Attendance: 10-A", "Upload Math Results"
- Homework creation form (title, description, due date, file attachments)
- Leave application form
- Syllabus progress tracker (checklist of topics taught)

---

### 2.4 STUDENT

**Profile:** The learner. Read-only access to academic information.

**Exact Permissions (from implementation plan line 220-227):**
1. View own attendance, results, schedule
2. View homework & notices
3. View Syllabus and Course Progress (what topics are pending)
4. View transportation details (assigned bus, route, transport info)
5. **Apply for Leave online** (pre-inform school digitally)
6. Profile dashboard (read-only mostly)
7. Cannot view other students' data

**Dashboard Features:**
- Attendance calendar (color-coded: green=present, red=absent, yellow=late)
- Subject-wise marks and grades
- Homework list with submission tracking
- Timetable grid view
- Leave application form with status tracker
- Transport details: Bus number, route, transport contact

---

### 2.5 PARENT

**Profile:** Guardian & financer. Monitors child and pays fees.

**Exact Permissions (from implementation plan line 229-236):**
1. View child's all info (attendance, results, fees)
2. View Syllabus and Course Progress
3. Make fee payments (online via Razorpay)
4. Download receipts (PDF)
5. View teacher/transport info
6. View notices & approve child's leave
7. Cannot modify any data (strictly read-only + payment)

**Dashboard Features:**
- Child selector (if parent has multiple children in same school)
- Quick summary: Attendance %, Pending Fees, Last Exam Marks
- Fee payment card with UPI/Card/NetBanking options
- Payment history with receipt downloads
- Attendance calendar view
- Teacher contact information
- AI Behavioral & Skill Report (narrative personality assessment)
- Transport tracking (bus route, transport staff details)
- Document Vault access (report cards, certificates, medical records)
- Notice board (school announcements, fee reminders, exam schedules)

---


### 2.7 ACCOUNTANT

**Profile:** Financial operations executor.

**Exact Permissions (from implementation plan line 244-250):**
1. Fee collection management (view all incoming payments)
2. Generate receipts (online + offline payments)
3. Expense management (add expenses with categories and receipts)
4. Financial reports (income vs expense, monthly statements)
5. Cannot access academic results
6. Cannot modify student/teacher data

**Dashboard Features:**
- Today's collections (total amount: online + offline)
- Pending dues overview (total outstanding across all students)
- Class-wise collection summary
- Receipt generation (online auto + offline manual)
- Bulk receipt printing
- Expense entry form (category, amount, date, vendor receipt upload)
- Expense approval workflow (expenses above threshold need Principal approval)
- SmartCollect dashboard (auto-matched vs unmatched payments)
- Financial reports: Income vs Expense, Monthly Statement, Tax-ready Export
- Audit trail log (immutable record of all financial transactions)

---

### 2.8 ADMIN_STAFF (Front Office / Admission Clerk)

**Profile:** School front office staff. Handles new student admissions, credential generation, class assignment, and sibling management.

**Exact Permissions:**
1. New student admission entry (complete admission form)
2. Auto-generate student & parent login credentials (username + default password)
3. Assign student to class & section
4. Link sibling accounts (connect multiple children to one parent login)
5. Unlink sibling (in case of error or parent separation)
6. Print/SMS admission welcome letter with credentials
7. View admission records (read-only after submission)
8. Cannot access academic results, fees, or modify teacher data

**Dashboard Features:**
- New Admission Form (student details, parent details, class assignment)
- "Has Sibling in School?" checkbox → Search existing student → Auto-fill parent details
- Today's admissions count
- Pending admissions (incomplete forms)
- Admission register (searchable list of all admitted students)
- Quick actions: "Generate Credentials", "Print Welcome Letter", "Send SMS"

---

### 2.9 LIBRARIAN

**Profile:** Library manager responsible for book circulation and cataloging.

**Exact Permissions:**
1. Manage Book Catalog (Add/Edit/Delete Books, Variants, Barcodes).
2. Issue and Return Books via barcode scanning.
3. Manage Due Dates and calculate/levy Late Fines.
4. Cannot access academic results, fees, or modify student/teacher data.

**Dashboard Features:**
- 5-Second Barcode Issue/Return queue interface.
- Low-stock / Unavailable Book tracking.
- Overdue Books list and fine collection.

---

### 2.10 STORE_MANAGER

**Profile:** Inventory and stock operations manager for uniforms, books, and stationery.

**Exact Permissions:**
1. Manage Inventory Items and Variants (Sizes).
2. Track and update stock levels.
3. Execute POS Billing for counter sales.
4. Cannot access academic results, library, or core school fees.

**Dashboard Features:**
- Thermal POS billing interface (Cash/QR payment checkout).
- Low Stock alerts dashboard.
- Vendor and Purchase Order ledger.

---

## 3. Core Modules — Feature-by-Feature Deep Dive

### 3.1 Multi-Tenant Foundation Module
**Database Tables Used:** `School`, `User`

**School Table Fields:**
- `id` — UUID primary key
- `name` — School display name
- `logo` — Logo URL (stored in Cloudflare R2)
- `address` — Physical address
- `contact` — Phone/email
- `subscription_plan` — FREE | BASIC | PREMIUM
- `academic_year_start` — Date
- `academic_year_end` — Date
- `settings` — JSON blob for school-specific configurations (grading scale, SMS preferences, theme colors)

**User Table Fields:**
- `id` — UUID primary key
- `school_id` — Foreign key to School (TENANT ISOLATION KEY)
- `email` — Unique login identifier
- `phone` — Contact number
- `password_hash` — bcrypt hashed password
- `role` — Enum: MASTER_ADMIN | SUPER_ADMIN | ADMIN_STAFF | TEACHER | STUDENT | PARENT | ACCOUNTANT | LIBRARIAN | STORE_MANAGER
- `profile_image` — Avatar URL
- `is_active` — Boolean (for suspending users without deleting)
- `created_at`, `updated_at` — Timestamps

---

### 3.2 Academic & Syllabus Module
**Database Tables Used:** `Class`, `Subject`, `ClassTeacher`, `Timetable`, `AcademicSchedule`, `Syllabus`

**Class Table Fields:**
- `id`, `school_id`, `name` (e.g., "10th"), `section` (e.g., "A"), `academic_year`

**Subject Table Fields:**
- `id`, `school_id`, `name` (e.g., "Mathematics"), `code` (e.g., "MATH101"), `class_id` (FK)

**ClassTeacher Mapping Fields:**
- `teacher_id` (FK), `class_id` (FK), `subject_id` (FK)
- `is_class_teacher` (boolean — only one teacher per class gets this flag)
- `assigned_by` (super_admin_id who made this assignment)

**Timetable Table Fields:**
- `id`, `class_id`, `subject_id`, `teacher_id`
- `day_of_week` (MON-SAT), `start_time`, `end_time`, `room`
- `is_ai_generated` (boolean — tracks if this slot was created by AI or manually)

**AcademicSchedule Table Fields:**
- `id`, `school_id`, `title` (e.g., "Diwali Holiday"), `date`
- `type` — Enum: EXAM | HOLIDAY | EVENT
- `description` — Detailed text

**Syllabus Table Fields:**
- `id`, `class_id`, `subject_id`, `academic_year`
- `topics` — JSON array of objects: `{ topic_name: string, expected_hours: number, is_completed: boolean, completion_date: Date | null }`
- `uploaded_by` — super_admin_id or teacher_id

**Syllabus Workflow:**
1. Super Admin or Teacher uploads the syllabus (topic list) at academic year start
2. Teacher marks topics as completed daily
3. Parents & Students view a live progress bar (% completed)
4. AI monitors progress — if syllabus is lagging behind, AI suggests how to merge 2 topics in upcoming classes to catch up before exams

---

### 3.3 Attendance Module
**Database Tables Used:** `Attendance`

**Attendance Table Fields:**
- `id`, `student_id` (FK), `class_id` (FK), `date`
- `status` — Enum: PRESENT | ABSENT | LATE | HALF_DAY
- `marked_by` — teacher_id who recorded this

**Key Features:**
1. Teacher marks attendance for assigned class only
2. Photo-grid UI for rapid marking (tap absent students)
3. "Mark All Present" one-click action button
4. **Offline-First**: Works without internet, syncs when online
5. Calendar view for students/parents (color-coded monthly calendar)
6. Attendance percentage calculation (overall & monthly)
7. AI anomaly detection: Alert if student's attendance suddenly drops

---

### 3.4 Examination & Results Module
**Database Tables Used:** `Exam`, `Result`

**Exam Table Fields:**
- `id`, `school_id`, `name` (e.g., "Unit Test 1"), `class_id`, `subject_id`
- `date`, `total_marks`, `passing_marks`
- `type` — Enum: UNIT_TEST | MID_TERM | FINAL

**Result Table Fields:**
- `id`, `exam_id` (FK), `student_id` (FK)
- `marks_obtained`, `grade` (auto-calculated), `remarks`
- `uploaded_by` — teacher_id

**Key Features:**
1. Super Admin creates exam definitions
2. Teachers upload marks per student per subject
3. **Hybrid Marks Entry (Manual + Excel):**
   - **Manual Inline:** Teacher selects class/subject -> Student list appears. Teacher types marks, and grades auto-calculate instantly on screen.
   - **Excel Bulk:** Teacher clicks "Download Template" -> System provides `.xlsx` with all student names & roll numbers pre-filled. Teacher fills marks offline and uploads the file.
4. System auto-calculates grades based on school's grading scale
5. Report card generation (PDF download)
6. Progress trends: Visual chart showing improvement/decline over exams
7. AI-generated narrative report (behavioral + academic analysis)

---

### 3.5 Homework Module
**Database Tables Used:** `Homework`

**Homework Table Fields:**
- `id`, `class_id`, `subject_id`, `teacher_id`
- `title`, `description`, `due_date`
- `attachments` — JSON array of file URLs (stored in Cloudflare R2)
- `created_at`

**Key Features:**
1. Teacher creates homework with title, description, due date
2. File attachments (PDFs, images) uploaded to Cloudflare R2
3. Students view homework list sorted by due date
4. Submission tracking

---

### 3.6 Transportation Module (Admin Managed)
**Purpose:** Manage school vehicle logistics securely without requiring low-tech staff (drivers/conductors) to use a digital application.

**Database Tables Used:** `Vehicle`, `Route`, `TransportStaff`

**TransportStaff Table Fields (Secure HR Data):**
- `id`, `school_id`, `name`, `phone`
- `role` — Enum: TRANSPORT_STAFF
- `license_number`, `aadhar_number` — Sensitive government IDs
- `experience_years`, `police_verified` — Safety compliance checks
- `is_active`

**Vehicle Table Fields:**
- `id`, `school_id`, `bus_number`, `capacity`, `is_active`
- `driver_id` (FK) — Link to TransportStaff

**Route Table Fields:**
- `id`, `school_id`, `name` (e.g., "Route 5 - South Delhi")
- `vehicle_id` (FK)
- `conductor_id` (FK) — Link to TransportStaff
- `stops` — JSON array of `{ name: string, lat: number, lng: number, time: string }`

**Detailed Capabilities & Flows:**
1. **Strict HR Data Isolation:** `TransportStaff` is strictly an administrative record. It does NOT link to the `User` table, meaning drivers cannot log in. Highly sensitive details like Police Verification, Aadhar, and detailed License numbers remain securely locked inside the Super Admin's dashboard.
2. **Vehicle & Route Assignment:** Super Admin creates routes with GPS coordinates and expected timings for each stop. Admin then maps a `Vehicle`, a `DRIVER` (TransportStaff), and a `CONDUCTOR` (TransportStaff) to that route.
3. **Capacity Engine:** System automatically prevents Admin from assigning more students to a route than the assigned vehicle's `capacity` allows.
4. **Parent Visibility (Filtered Access):** The API heavily filters the data sent to the Parent App. Parents only see:
   - Assigned Bus Number & Route Name
   - Expected Stop Timings
   - Staff Name and Contact Number (for direct emergency calls)
   - They NEVER see the staff's HR documents or license numbers.
5. **Automated Fleet Alerts:** A background cron job tracks vehicle and staff compliance. It triggers alerts on the Super Admin dashboard when:
   - A staff's license is expiring within 30 days.
   - A vehicle's Fitness Certificate or Insurance is expiring within 30 days.

### 3.7 Fee & Finance Module
**Database Tables Used:** `FeeStructure`, `FeePayment`, `Expense`

**FeeStructure Table Fields:**
- `id`, `school_id`, `class_id`, `academic_year`
- `fee_type` — Enum: TUITION | TRANSPORT | LIBRARY | SPORTS
- `amount`, `due_date`
- `frequency` — Enum: MONTHLY | QUARTERLY | ANNUAL
- `late_fee_per_day` — Auto-added penalty amount

**FeePayment Table Fields:**
- `id`, `student_id` (FK), `fee_structure_id` (FK)
- `amount_paid`, `payment_date`, `payment_method` (UPI, Card, Cash, Cheque)
- `transaction_id` — Razorpay transaction reference
- `receipt_number` — System-generated unique number
- `status` — Enum: PAID | PARTIAL | PENDING | OVERDUE
- `online_receipt_url` — PDF download link

**Expense Table Fields:**
- `id`, `school_id`, `category` (e.g., Electricity, Stationery)
- `amount`, `description`, `date`
- `approved_by` — Principal approval for large expenses
- `receipt_attachment` — Vendor bill/invoice scan URL

**Key Features:**
1. Super Admin defines fee structures per class per academic year
2. Multiple fee types supported (tuition, transport, library, sports)
3. Flexible frequency: monthly, quarterly, annual
4. Late fee auto-calculation per day
5. Online payment via Razorpay (UPI, Card, NetBanking)
6. **Auto-Reconciliation via SmartCollect:** Each student gets unique Virtual UPI ID. Payment auto-matches to student.
7. Offline payment entry by Accountant (cash/cheque)
8. Receipt auto-generation (both online and offline)
9. Bulk receipt printing
10. Payment history with transaction IDs
11. Expense tracking with category, vendor receipts
12. Expense approval workflow (amounts above threshold need Principal approval)
13. Financial reports: Income vs Expense, Monthly Statements, Tax-ready Export
14. Audit trail: Immutable log of all financial actions

---

### 3.8 Communication & Leave Module
**Database Tables Used:** `Notice`, `LeaveApplication`

**Notice Table Fields:**
- `id`, `school_id`, `title`, `content` (rich text)
- `target_roles` — JSON array (e.g., ["TEACHER", "PARENT"])
- `target_classes` — JSON array (e.g., ["class_10_A", "class_10_B"])
- `published_by` — super_admin_id
- `is_published` — Boolean (draft vs published)
- `publish_date` — Can be scheduled for future
- `attachments` — File URLs

**LeaveApplication Table Fields:**
- `id`, `user_id` (FK)
- `leave_type` — Enum: SICK | CASUAL | PERSONAL
- `role` — TEACHER | STUDENT (both can apply)
- `from_date`, `to_date`, `reason`
- `status` — Enum: PENDING | APPROVED | REJECTED
- `approved_by` — Who approved/rejected
- `ai_substitute_suggestion` — JSON object (AI suggests which free teacher can cover)
- `created_at`

**Notice Key Features:**
1. Rich text editor for creating notices
2. Target by role (Teachers only, Parents only, or All)
3. Target by class (specific class/section)
4. Schedule notice for future date/time
5. **AI Smart Notices:** Auto-draft professional notices from short prompts via Gemini
6. Auto-translate to Hindi/regional languages

**Leave Key Features:**
1. Teachers apply for leave (SICK, CASUAL, PERSONAL)
2. Students apply for leave (pre-inform school online)
3. Multi-step approval: Student applies → Parent approves → School approves
4. **AI Substitute Suggester:** When teacher applies leave, AI finds which teacher is free during that period and teaches the same/similar subject
5. Leave status tracking (PENDING → APPROVED/REJECTED)

---

### 3.9 Admission & Onboarding Module (Omni-Channel)
**Database Tables Used:** `AdmissionEnquiry`, `StudentProfile`, `ParentProfile`, `User`, `FeePayment`

**AdmissionEnquiry Table Fields:**
- `id` — UUID primary key
- `school_id` — FK to School
- `student_name`, `dob`, `gender`
- `parent_name`, `parent_phone`, `parent_email`
- `previous_school`, `previous_class`
- `applied_for_class` — Which class admission is for
- `source` — Enum: MANUAL | QR_CODE | BULK_IMPORT (tracks how admission was created)
- `status` — Enum: ENQUIRY | APPLIED | ADMITTED | REJECTED
- `documents` — JSON array of uploaded document URLs (Birth Certificate, Aadhaar, TC) — **OPTIONAL at admission time**
- `documents_pending` — Boolean (true if docs were skipped during fast entry)
- `admission_fee_status` — Enum: PAID | PARTIAL | PENDING | WAIVED
- `admission_fee_amount` — Float (total admission fee for this class)
- `admission_fee_paid` — Float (amount actually collected)
- `admission_fee_discount` — Float (Principal's waiver/discount amount)
- `admission_fee_discount_reason` — String? (e.g., "Sibling Discount", "Staff Ward")
- `notes` — Admin staff remarks
- `created_at`, `updated_at`

**3 Pillars of Admission (Omni-Channel):**

**Pillar 1 — High-Speed Data Entry Mode (Staff Manual Entry):**
> Designed for extreme speed. Staff can enter a full admission in <30 seconds.
1. **Single Page Layout:** No wizard/steps. All fields visible on one clean, scrollable form.
2. **Keyboard-Only Navigation:** Fully optimized for `Tab` index. Dropdowns support type-to-search. `Enter` at end submits. No mouse needed.
3. **Smart Defaults:** Admission Date = today, Academic Year = current, State/City = pre-filled from school config.
4. **Instant Sibling Auto-Fill:** Typing 10-digit number in Parent Phone field instantly auto-fills Father Name, Mother Name, Address if parent exists in system. No search button needed.
5. **Skip Documents:** Birth Cert, Aadhaar, TC uploads are 100% optional. Staff can skip and upload later. `documents_pending = true` flag tracks this.
6. **Instant Fee Collection:** Form ends with Admission Fee section — Staff can log Cash/Cheque/UPI payment immediately.
7. **Submit & Auto-Reset:** On submit → Auto-generates credentials + Roll Number + fires SMS → Shows 3-second success toast → Form clears instantly for next entry. No page reload.

**Pillar 2 — QR Code Self-Serve (Parent Driven):**
> Designed to offload data entry to parents while waiting at reception.
1. School reception has QR code poster. Parent scans with phone camera.
2. Opens simple, mobile-friendly 3-field form: Student Name, Parent Phone, Class Applied For.
3. Parent submits → Appears instantly in Staff's "Pending Enquiries" list (real-time via Pusher).
4. Staff calls parent to desk, collects physical documents, uploads them optionally.
5. Staff selects Class, Section, Roll Number → Clicks "Approve" → Same automation triggers (credentials + SMS).

**Pillar 3 — Bulk CSV Import (Legacy Data Migration):**
> Designed for onboarding hundreds of existing students from old paper registers.
1. Staff clicks "Download Excel Template" → Gets `.xlsx` with predefined columns (Name, Father Name, Phone, Class, Section, DOB).
2. Excel has built-in validation: 10-digit phone numbers, valid date formats, class names matching system.
3. Staff fills register data into Excel → Uploads via "Bulk Import" button.
4. System auto-creates all Student + Parent accounts in batch, links siblings by matching phone numbers.
5. Mass SMS broadcast: All parents receive credentials simultaneously.

**Admission Fee Edge Cases:**
1. **Full Payment:** Parent pays ₹10,000 admission fee in cash/UPI → `admission_fee_status = PAID`
2. **Partial Payment:** Parent has only ₹5,000 → Staff enters ₹5,000 → Remaining ₹5,000 auto-moves to "Pending Dues" → `admission_fee_status = PARTIAL`
3. **Promise to Pay Later (Grace Period):** Parent says "sham ko UPI karunga" → Admission approved → `admission_fee_status = PENDING` → System sends payment reminder SMS next day
4. **Principal's Discount (Waiver):** Principal approves ₹2,000 off (sibling discount / staff ward) → Staff fills `admission_fee_discount = 2000` + `discount_reason = "Sibling Discount"` → Books stay balanced

**Missing Documents Dashboard:**
- Staff dashboard widget: "Missing Documents (12 students)" 
- Lists students whose `documents_pending = true`
- Staff can follow up and upload documents anytime later without affecting admission status

**Sibling Mapping Feature:**
- **"Has Sibling?" Checkbox:** Admin Staff ticks → Searches existing students by name/phone
- **Auto-Fill:** System fetches existing parent's User + ParentProfile → Links new student to same parent
- **Parent Dashboard:** Parent sees "Profile Switcher" dropdown to toggle between children
- **Fee Isolation:** Each child has own `virtualAccountId` (Razorpay) — fees never mix

**Sibling Edge Cases:**
1. **Wrong Link:** "Unlink Sibling" button → Creates fresh parent account for the student
2. **Divorce/Separated Parents:** Option to assign 2 guardians with separate logins
3. **One Child Leaves (ALUMNI):** Parent retains access to remaining child. Alumni child's data becomes read-only
4. **Fee Data Integrity:** FeePayment is linked to `studentId`, NOT `parentId` — no cross-child contamination

---

### 3.10 Library Management System (Digital LMS)
*Automating the school's physical library operations.*
- **Barcode Engine:** USB Barcode scanner support for books and student ID cards.
- **5-Second Issue/Return:** Lightning-fast issue flow without keyboard typing.
- **Fine Calculation Engine:** Auto-calculates overdue fines based on rules (e.g., ₹5/day).
- **Fee Integration:** Outstanding fines can be instantly added to the student's next "Fee Dues" challan.
- **Parent Portal:** Real-time visibility into issued books and upcoming due dates via SMS/Push reminders.

### 3.11 Inventory & Store Management (POS Billing)
*Managing school uniform, books, and stationery sales.*
- **Item Master with Variants:** Grouping items (e.g., Winter Blazer) with size variants (28, 30, 32) and separate stock counters.
- **POS Billing Screen:** Cashier-optimized counter interface for quick checkout.
- **Thermal Receipt:** ESC/POS 80mm thermal printer support for instant GST/bill printing.
- **Stock Depletion & Alerts:** Auto-decrements stock on sale; triggers low-stock dashboard alerts.

### 3.12 HR & Payroll Management (Staff Salaries)
*End-to-end employee salary and deduction management.*
- **Salary Setup:** Basic + HRA + Allowances - PF - ESI - TDS configurations.
- **Attendance Sync:** Pulls teacher attendance and approved leaves directly into the payroll calculation.
- **1-Click Payroll Run:** Computes net salary for all staff at month-end based on payable days.
- **Bank Transfer Export:** Generates bulk bank transfer NACH files (Excel/CSV) for instant payout.
- **Digital Payslips:** Staff can download automated PDF salary slips directly from their dashboard.

### 3.13 1-Click Certificate Generator
*Instant generation of TC, Bonafide, and Character Certificates.*
- **Dues Verification Block:** The system blocks Transfer Certificate (TC) generation if library fines or school fees are pending.
- **Auto-Fill Data:** Replaces manual typing by mapping DB fields (Name, Admission Date, DOB in words, Category) directly onto standard certificate templates.
- **Anti-Fraud QR Code:** Each generated certificate prints a verifiable QR code. Scanning it checks our database to confirm authenticity.
- **Lifecycle Update:** Issuing a TC automatically transitions the student status to `ALUMNI`.

### 3.14 Standardized Report Card Designer
*Complex board-specific grading and printable report generation.*
- **Custom Grading Bounds:** Configurable rules for CBSE (e.g., 91-100 = A1) or State Boards.
- **Term Weightage:** Auto-calculates final scores based on weights (e.g., 20% PT + 80% Final).
- **Co-Scholastic Tracking:** A/B/C grading for discipline, art, and health.
- **AI Remarks:** Gemini API generates a 2-line personalized remark per student based on strong/weak subjects.
- **Bulk PDF Export:** Generates the entire class's report cards as a single, print-ready, high-resolution PDF with Principal signatures.

### 3.15 1-Click Govt & CBSE Inspection Report Export (U-DISE+)
*Solves the 15-day manual data aggregation pain point for Principals during annual affiliation inspections.*
- **Demographics Matrix:** Auto-calculates category-wise (General/OBC/SC/ST/EWS), gender-wise, and minority student counts per class.
- **Pupil-Teacher Ratio (PTR):** Evaluates current active student count vs active teaching staff against board norms (e.g., 30:1).
- **Staff Credential Register:** Generates a formatted table of all teachers, showing B.Ed/CTET qualifications, joining date, and salary account details.
- **Transport Safety Compliance:** Summarizes active school buses, pollution/insurance validity, and staff police verification status.
- **1-Click Export Format:** Outputs directly into an audit-ready, government-standard Excel/CSV format (CBSE OASIS & UDISE+ compatible).

---

## 4. AI Features — The 10 Market Differentiators

### Feature 1: Smart Timetable Generator
- **Input:** Teachers list, subjects list, classes list, room constraints, teacher availability
- **Output:** Conflict-free optimal weekly timetable
- **Algorithm:** Constraint satisfaction + Gemini API for optimization
- **Key Rule:** No teacher can be assigned to 2 classes at the same time
- **Tracks:** `is_ai_generated` boolean in Timetable table

### Feature 2: Leave Substitute Suggester
- **Trigger:** Teacher applies for leave
- **Logic:** AI scans timetable, finds which teachers are free during the absent teacher's periods
- **Preference:** Same subject teacher gets priority
- **Balancing:** Considers workload — doesn't overload one teacher with all substitutions
- **Output:** JSON suggestion stored in `ai_substitute_suggestion` field

### Feature 3: Smart Notices (AI-Drafted)
- **Trigger:** Super Admin types short topic like "Holiday for Diwali from 10th to 14th"
- **Output:** Full professionally formatted notice in English
- **Extra:** Auto-translate to Hindi/regional languages via Gemini

### Feature 4: Auto Fee Reconciliation (SmartCollect)
- **Mechanism:** Every student gets a unique Virtual UPI ID / Virtual Bank Account via Razorpay SmartCollect
- **Flow:** Parent pays → Razorpay webhook fires → System auto-identifies student → Fee marked PAID
- **Result:** Zero manual entry by Accountant for online payments

### Feature 5: Holistic Behavioral & Skill Mapping
- **Year-long Process:** Teachers assign predefined tags throughout the year (e.g., "Leadership", "Helpful", "Distracted", "Creative Problem Solver")
- **Year-end AI:** Gemini analyzes all tags + marks to generate a **Professional Narrative Report**
- **Output:** 2-3 paragraph personality + academic summary per student
- **Value:** Parents see beyond just "85/100" — they see the child's soft skills and growth areas

### Feature 6: Smart Syllabus Progress Tracker
- **Setup:** Admin/Teacher uploads topic list at start of year
- **Daily:** Teacher checks off completed topics
- **Visibility:** Parents and Students see live progress bar (% completed)
- **AI Alert:** If syllabus is lagging behind expected schedule, AI suggests how to merge upcoming topics to finish before exams

### Feature 7: School Document Vault (DigiLocker Style)
- **What:** Report cards, Transfer Certificates, Medical Records — all stored permanently in the cloud
- **Security:** Cryptographically secure, verified by school
- **Benefit:** Parents never lose physical documents
- **Storage:** Cloudflare R2 / AWS S3

### Feature 8: Professional Bulk SMS (DLT Approved)
- **Provider:** MSG91 or Twilio
- **Compliance:** TRAI DLT-approved transactional SMS templates
- **Sender ID:** SCH-ERP (professional, trusted)
- **Use Cases:** Fee reminders, absence alerts, emergency notices
- **Why not WhatsApp:** WhatsApp Business API is expensive; DLT SMS is cheap and universally received

### Feature 9: Offline-First App
- **Problem:** Tier-2/3 schools have poor internet inside buildings
- **Solution:** Teacher's app works completely offline
- **What works offline:** Attendance marking, marks uploading
- **Sync Mechanism:** "Sync Queue" with "Timestamp-based resolution"
- **Conflict Rule:** Attendance is locked by Date + Class — prevents duplicate/conflicting entries
- **User Experience:** Toast: "Saved Offline. Will sync when connected."

### Feature 10: AI "At-Risk" Early Warning System
- **Background Process:** AI continuously monitors attendance drops, homework completion rates, test marks
- **Trigger:** If student suddenly stops attending or grades crash
- **Alert:** Principal/Counselor gets an "Early Warning Alert"
- **Purpose:** School can intervene early with counseling before the student fails or drops out

---

## 5. UI/UX Strategy — 5 Design Principles (from implementation plan)

1. **Universal Access (Web + Mobile):** Chahe Admin ho, Teacher, Student ya Parent — sabke paas choice hogi. Web portal (laptop) ya Mobile App (phone). Data instantly sync hoga.
2. **Role-Specific Clutter-Free Dashboards:** Har user ko sirf apna kaam dikhega.  Irrelevant features invisible, not just disabled.
3. **Language Toggle (Vernacular):** Parents ke liye app ko Hindi/regional language mein switch karne ka 1-click option.
4. **Icon-Driven Design:** Text kam aur bade, clear icons zyada. Leave ke liye bada Calendar Icon, Fee ke liye Rupee Icon.
5. **One-Click Actions:** Teachers ke liye "Mark All Present" ya "Remind All Unpaid Parents" jaise one-click buttons taaki unka time bache.

---

## 6. Market Comparison — 8 Differentiators

| Feature | Teachmint / Fedena | Our School ERP |
|---|---|---|
| Timetable | ❌ Manual creation | ✅ AI-generated, conflict-free |
| Leave Management | Basic approval only | ✅ AI substitute suggestion |
| UI/UX | Outdated, cluttered | ✅ Modern, premium (shadcn/ui) |
| Notices | Basic text | ✅ AI-drafted, multi-language auto-translate |
| Reports | Template-based | ✅ AI-generated narrative insights |
| Pricing | ₹50-200/student/year | ✅ Competitive, flexible tiers |
| Customization | Limited | ✅ Per-school branding (logo, colors) |
| Receipts | Limited offline support | ✅ Both online & offline receipt generation |

---

## 7. Cost Estimate (Monthly Infrastructure)

| Service | Free Tier | Production |
|---|---|---|
| Vercel (Hosting) | Free (hobby) | $20/mo |
| Supabase/Neon (DB) | Free (500MB) | $25/mo |
| Cloudflare R2 (Files) | Free (10GB) | ~$5/mo |
| Gemini API (AI) | Free tier generous | ~$10-50/mo |
| Razorpay (Payments) | 2% per txn | 2% per txn |
| Resend (Email) | Free (100/day) | $20/mo |
| Domain | — | $10-15/year |
| **Total (Start)** | **~$0-5/mo** | **~$80-120/mo** |

---

## 8. Success KPIs

- **Teacher Adoption:** 95% teachers marking attendance digitally within 2 weeks
- **Timetable Efficiency:** AI generates conflict-free timetable in under 30 seconds
- **Fee Recovery:** 30% increase in on-time payments via automated SMS + UPI links
- **Offline Reliability:** 99.9% sync success rate for offline-queued data
- **API Performance:** <300ms response time at 99th percentile

## [v2.0 SaaS Architecture Upgrades]
This document has been upgraded with the following SaaS features:
1. **ERPVyapar Rebranding**: The platform is now named ERPVyapar.
2. **Multi-School Login Logic**: Users belonging to multiple schools will be prompted with a "Select School" box upon logging in.
3. **Dedicated School Login Panels**: Generic login is deprecated. Each school has dedicated URLs (`/school/[slug]/staff-login` and `/school/[slug]/student-login`).
4. **Custom Domains**: Schools can attach custom domains (e.g., `gmacademy.com`) stored in the `customDomain` field, routed dynamically via Next.js middleware.
5. **Custom Roles (RBAC)**: The hardcoded Role enum is replaced by a dynamic `SystemRole` table allowing Super Admins to create customized roles combining multiple permissions (e.g., Admissions + Transport).
6. **Master Admin Portal**: The developer/agency portal is strictly isolated at a secret `/hq` route. Master Admins cannot use school login pages.
