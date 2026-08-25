# Product Requirements Document (PRD) — School ERP Portal

> **Version:** 2.0 | **Status:** Final Draft
> **Product Type:** Multi-Tenant SaaS Platform
> **Target Market:** Tier-2 & Tier-3 Indian Schools

---

## 1. Product Vision & Overview

Ek **production-ready, multi-tenant School ERP SaaS Platform** banana hai jo AI-powered features ke saath existing market solutions (Teachmint, Fedena, Vidyalaya) se behtar ho.

**Approach:** Pehle **Phase 1 mein ek single-school MVP** banayenge, phir **Phase 2 mein multi-tenant SaaS** mein convert karenge.

**Core Differentiators:**
1. AI-Powered Intelligence (Google Gemini) — Timetabling, Report Generation, At-Risk Alerts
2. Offline-First Architecture — Teachers can work without internet
3. Auto Fee Reconciliation — Razorpay SmartCollect, zero manual entry
4. Consumer-Grade Premium UI — shadcn/ui + Tailwind CSS
5. Universal Access — Web + Mobile App dono available for ALL roles

---

## 2. Target Users & Role-Based Access Control (RBAC)

System mein **8 distinct user roles** hain. Har role ka apna isolated dashboard hai. Ek role doosre role ka data access nahi kar sakta.

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
2. Assign all roles (create Teacher, Student, Parent, Driver, Accountant accounts)
3. Class-Teacher mapping (assign teachers to specific classes and subjects)
4. Publish notices & Define Syllabus
5. Academic schedule management (exams, holidays, events calendar)
6. View all reports (attendance, marks, financial, behavioral)
7. Fee structure setup (define fee types, amounts, due dates)
8. Transportation management (vehicles, routes, drivers)

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
4. View transportation details (assigned bus, route, driver info)
5. **Apply for Leave online** (pre-inform school digitally)
6. Profile dashboard (read-only mostly)
7. Cannot view other students' data

**Dashboard Features:**
- Attendance calendar (color-coded: green=present, red=absent, yellow=late)
- Subject-wise marks and grades
- Homework list with submission tracking
- Timetable grid view
- Leave application form with status tracker
- Transport details: Bus number, route, driver contact

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
- Transport tracking (bus route, driver details)
- Document Vault access (report cards, certificates, medical records)
- Notice board (school announcements, fee reminders, exam schedules)

---

### 2.6 DRIVER / CONDUCTOR

**Profile:** Transport logistics operator.

**Exact Permissions (from implementation plan line 238-242):**
1. Update own profile (name, phone, license, emergency contact)
2. View assigned route (route name, stops, timings, student list)
3. Mark vehicle status (active, breakdown, maintenance)
4. Cannot access academic data (no marks, attendance, or fee information)

**Dashboard Features:**
- Profile management (personal details, license number & validity, emergency contact)
- Route details: Assigned route with stop list and expected timings
- Student list on route (names and pickup points)
- Vehicle status: Bus number, capacity, fitness certificate validity
- Trip initiation: "Start Trip" / "End Trip" buttons

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
- `role` — Enum: MASTER_ADMIN | SUPER_ADMIN | ADMIN_STAFF | TEACHER | STUDENT | PARENT | DRIVER | ACCOUNTANT
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
3. System auto-calculates grades based on school's grading scale
4. Report card generation (PDF download)
5. Progress trends: Visual chart showing improvement/decline over exams
6. AI-generated narrative report (behavioral + academic analysis)

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

### 3.6 Transportation & Fleet Module
**Database Tables Used:** `Vehicle`, `Route`, `DriverProfile`

**Vehicle Table Fields:**
- `id`, `school_id`, `bus_number`, `capacity`, `is_active`

**Route Table Fields:**
- `id`, `school_id`, `name` (e.g., "Route 5 - South Delhi")
- `vehicle_id` (FK)
- `stops` — JSON array of `{ name: string, lat: number, lng: number, time: string }`
- `driver_id` (FK), `conductor_id` (FK)

**DriverProfile Table Fields:**
- `id`, `user_id` (FK), `license_number`
- `contact`, `emergency_contact`
- `assigned_vehicle_id` (FK)

**Key Features:**
1. Super Admin creates vehicles and routes
2. Assigns drivers to vehicles and routes
3. Capacity validation: Cannot assign more students than vehicle seats
4. Students/Parents view their assigned route, bus, and driver info
5. Driver views stop list with expected timings
6. License expiry tracking with alerts

---

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
2. **Role-Specific Clutter-Free Dashboards:** Har user ko sirf apna kaam dikhega. Driver ko marks nahi dikhenge, bas Route aur map dikhega. Irrelevant features invisible, not just disabled.
3. **Language Toggle (Vernacular):** Parents aur Drivers ke liye app ko Hindi/regional language mein switch karne ka 1-click option.
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
