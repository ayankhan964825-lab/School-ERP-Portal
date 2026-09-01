# System Design & Cloud Architecture — School ERP Portal

> **Version:** 2.0 | **Status:** Final Draft
> **Pattern:** Modular Monolith → Microservices (Phase 3+)

---

## 1. Three-Layer Architecture (from implementation plan lines 31-59)

The system is divided into 3 strict layers. No layer can bypass another.

### Layer 1: Frontend Layer
- **Next.js 14 (Web)** — Available for ALL 7 roles
- **React Native Expo (Mobile)** — Available for ALL 7 roles
- **7 Isolated Panel UIs:** Master Admin, Super Admin, Teacher, Student, Parent, Driver, Accountant
- **8th Panel:** Admin Staff (Front Office / Admission)
- Each panel is a separate route group under `(dashboard)/`

### Layer 2: API Layer
- **tRPC + Next.js API Routes** — 10 domain routers (school, user, class, attendance, result, fee, transport, notice, leave, admission)
- **Auth/RBAC Middleware** — JWT verification at Edge. Role-based route protection.
- **AI Engine Service** — Centralized Gemini API calls (`src/lib/ai/`)
- **Payment Gateway** — Razorpay SDK + SmartCollect webhook handler

### Layer 3: Data Layer
- **PostgreSQL (Prisma)** — 20 relational tables. Multi-tenant via `schoolId` FK.
- **Redis (Upstash)** — Caching (timetable, school config), Rate limiting (AI features), Session state
- **S3/R2 (Cloudflare)** — File storage: profile images, homework attachments, fee receipts, document vault

---

## 2. Sequence Diagrams for Every Critical Flow

### 2.1 Authentication Flow (NextAuth.js v5 + JWT)
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Frontend
    participant Edge as Edge Middleware
    participant API as NextAuth API
    participant DB as PostgreSQL

    User->>Web: Enter email + password
    Web->>API: POST /api/auth/callback/credentials
    API->>DB: SELECT * FROM User WHERE email = ?
    DB-->>API: Return User row
    API->>API: bcrypt.compare(password, passwordHash)
    alt Password Match
        API->>API: Generate JWT { sub, email, role, schoolId, isActive }
        API-->>Web: Set secure httpOnly cookie with JWT
        Web->>Edge: Navigate to /(dashboard)/[role]
        Edge->>Edge: Decode JWT, check role vs route
        Edge-->>Web: Allow access
    else Password Mismatch
        API-->>Web: 401 Invalid Credentials
    end
```

### 2.2 Teacher Marks Attendance (Offline-First Sync)
```mermaid
sequenceDiagram
    autonumber
    actor Teacher
    participant PWA as Teacher PWA (Browser)
    participant IDB as IndexedDB (Dexie)
    participant API as Next.js API
    participant DB as PostgreSQL

    Teacher->>PWA: Opens Attendance page (Service Worker serves cached UI)
    PWA->>API: GET class roster (if online, fetch fresh)
    API-->>PWA: Student list for Class 10-A
    
    Teacher->>PWA: Taps 2 students as ABSENT, rest PRESENT
    Teacher->>PWA: Clicks "Submit"
    
    alt Online
        PWA->>API: POST /trpc/attendance.markBulk
        API->>DB: Prisma $transaction → Upsert 40 records
        DB-->>API: Success
        API-->>PWA: { success: true, syncedCount: 40 }
        PWA-->>Teacher: Toast: "Attendance Saved"
    else Offline
        PWA->>IDB: Push to SyncQueue { endpoint, payload, timestamp, status: PENDING }
        PWA-->>Teacher: Toast: "Saved Offline. Will sync when connected."
        
        Note over Teacher, PWA: Later... Network restored
        PWA->>PWA: window 'online' event fires
        PWA->>IDB: Fetch all PENDING items
        PWA->>API: POST /trpc/attendance.markBulk (batch)
        API->>DB: Upsert with Last-Write-Wins (compare syncedAt timestamps)
        DB-->>API: Success
        API-->>PWA: { success: true }
        PWA->>IDB: Update status: SYNCED
        PWA-->>Teacher: Toast: "Synced to Cloud ✓"
    end
```

### 2.3 Parent Pays Fee → Auto-Reconciliation (SmartCollect)
```mermaid
sequenceDiagram
    autonumber
    actor Parent
    participant Web as Parent Portal
    participant RP as Razorpay Gateway
    participant API as Next.js API
    participant DB as PostgreSQL
    participant SMS as MSG91 (DLT)

    Note over API, DB: Setup: Student enrolled → API creates Virtual Account via Razorpay
    API->>RP: Create Customer + Virtual Bank Account for Student
    RP-->>API: Returns Virtual Account Number (VA: 223344)
    API->>DB: Save virtualAccountId to StudentProfile

    Note over Parent, RP: Payment Flow
    Parent->>Web: Views fee dues → Clicks "Pay ₹5000 via UPI"
    Web->>RP: Initiate UPI Intent / IMPS transfer to VA 223344
    RP-->>Parent: Bank authenticates → Money deducted

    Note over RP, API: Async Webhook (seconds later)
    RP->>API: POST /api/webhooks/razorpay (virtual_account.credited)
    API->>API: Verify x-razorpay-signature hash (crypto.createHmac)
    API->>DB: Lookup student WHERE virtualAccountId = 223344
    DB-->>API: Student found: Rahul Kumar
    API->>DB: UPDATE FeePayment SET status='PAID', amountPaid=5000, transactionId=...
    DB-->>API: Transaction committed
    API->>API: Generate PDF receipt → Upload to R2
    API->>SMS: Dispatch DLT SMS: "Fee ₹5000 received for Rahul. Receipt: link"
    API-->>RP: 200 OK (Acknowledge webhook)
```

### 2.4 AI Timetable Generation
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin
    participant Web as Admin Dashboard
    participant API as Next.js API
    participant Redis as Upstash Redis
    participant AI as Gemini API
    participant DB as PostgreSQL

    Admin->>Web: Clicks "Generate AI Timetable"
    Web->>API: POST /trpc/ai.generateTimetable
    API->>Redis: Check rate limit (school_id, max 5/day)
    
    alt Rate Limit OK
        API->>DB: Fetch all Teachers, Subjects, Classes, Constraints
        DB-->>API: Return data
        API->>API: Build constraint satisfaction matrix
        API->>AI: Send constraints to Gemini (system prompt + data)
        AI-->>API: Return optimized schedule JSON
        API->>API: Validate: No teacher double-booked
        API->>DB: INSERT TimetablePeriod records (is_ai_generated = true)
        DB-->>API: Success
        API-->>Web: Return timetable grid
        Web-->>Admin: Display interactive timetable with drag-drop override
    else Rate Limit Exceeded
        API-->>Web: 429 Too Many Requests
        Web-->>Admin: Toast: "Daily limit reached. Try again tomorrow."
    end
```

### 2.5 AI Leave Substitute Suggestion
```mermaid
sequenceDiagram
    autonumber
    actor Teacher
    participant Web as Teacher Panel
    participant API as Next.js API
    participant AI as Gemini API
    participant DB as PostgreSQL

    Teacher->>Web: Fills leave form (SICK, tomorrow)
    Web->>API: POST /trpc/leave.apply
    API->>DB: INSERT LeaveApplication (status: PENDING)
    
    API->>DB: Fetch teacher's timetable for leave date
    DB-->>API: 4 periods: Math (10-A), Math (10-B), Free, Math (9-A)
    API->>DB: Fetch ALL teachers' timetables for same date
    DB-->>API: List of free teachers per period
    
    API->>AI: "Rank these free teachers for Math substitution"
    AI-->>API: Ranked suggestions with reasoning
    
    API->>DB: UPDATE LeaveApplication SET ai_substitute_suggestion = JSON
    API-->>Web: Show suggestions to Admin for final approval
```

### 2.6 Student Leave Application (Multi-Step Workflow)
```mermaid
sequenceDiagram
    autonumber
    actor Student
    actor Parent
    actor Admin as Super Admin
    participant API as Next.js API
    participant DB as PostgreSQL

    Student->>API: Apply leave (SICK, 2 days, reason)
    API->>DB: INSERT LeaveApplication (status: PENDING, role: STUDENT)
    API-->>Student: "Leave submitted. Waiting for parent approval."
    
    Note over Parent: Push notification / SMS
    Parent->>API: Approve child's leave
    API->>DB: UPDATE status = 'PARENT_APPROVED'
    
    Note over Admin: Dashboard shows pending leaves
    Admin->>API: Final approval
    API->>DB: UPDATE status = 'APPROVED', approvedBy = adminId
    API-->>Student: "Leave approved."
```

### 2.7 High-Speed Data Entry Admission (Staff Manual)
```mermaid
sequenceDiagram
    autonumber
    actor Staff as Admin Staff
    participant Web as Staff Dashboard (Single Page Form)
    participant API as Next.js API
    participant DB as PostgreSQL
    participant SMS as MSG91 (DLT)

    Staff->>Web: Opens New Admission (Single Page, Keyboard-Only)
    Staff->>Web: Tab → Student Name, Tab → DOB (auto-format), Tab → Class (autocomplete)
    Staff->>Web: Tab → Parent Phone (10 digits)
    
    Note over Web, API: Instant Sibling Auto-Fill
    Web->>API: GET /trpc/admission.searchSibling(parentPhone)
    alt Parent Exists (Sibling Found)
        API-->>Web: Auto-fill Father Name, Mother Name, Address
        Note over Web: Staff skips parent fields — already filled!
    else New Parent
        Staff->>Web: Tab → Father Name, Tab → Mother Name
    end

    Note over Staff, Web: Documents = OPTIONAL (Skip for speed)
    Staff->>Web: Tab → Skip documents (upload later)

    Note over Staff, Web: Admission Fee Collection
    Staff->>Web: Tab → Fee Amount (₹10,000 pre-filled from class config)
    alt Full Payment
        Staff->>Web: Tab → Amount Paid: ₹10,000, Method: Cash
    else Partial Payment
        Staff->>Web: Tab → Amount Paid: ₹5,000 → Remaining auto-moves to Pending Dues
    else Principal Discount
        Staff->>Web: Tab → Discount: ₹2,000, Reason: "Sibling Discount"
    end

    Staff->>Web: Press ENTER to Submit
    Web->>API: POST /trpc/admission.confirmAdmission
    API->>DB: INSERT User(STUDENT) + StudentProfile + FeePayment
    API->>DB: INSERT/REUSE User(PARENT) + ParentProfile
    API->>API: Generate Roll Number + Credentials
    API->>SMS: Send credentials to parent phone
    API-->>Web: Success! Form auto-resets for next entry
    Web-->>Staff: Toast: "Admitted! STD101 — SMS Sent" (3 sec) → Form Cleared
```

### 2.8 QR Code Self-Serve Admission (Parent Driven)
```mermaid
sequenceDiagram
    autonumber
    actor Parent
    actor Staff as Admin Staff
    participant QR as QR Code (Reception)
    participant Mobile as Parent's Phone (Browser)
    participant API as Next.js API
    participant DB as PostgreSQL
    participant Pusher as Pusher (Realtime)
    participant SMS as MSG91

    Parent->>QR: Scans QR code at school reception
    QR-->>Mobile: Opens simple 3-field mobile form
    Parent->>Mobile: Fills: Student Name, Phone, Class
    Mobile->>API: POST /trpc/admission.createQrEnquiry
    API->>DB: INSERT AdmissionEnquiry (source: QR_CODE, status: ENQUIRY)
    API->>Pusher: Push notification to Staff dashboard
    Pusher-->>Staff: 🔔 "New QR Enquiry: Priya Sharma (Class 5)"

    Note over Staff, Parent: Staff calls parent to desk
    Staff->>API: Open enquiry → Complete remaining fields
    Staff->>API: Upload documents (optional)
    Staff->>API: Select Section, Roll Number
    Staff->>API: Collect admission fee (Cash/UPI)
    Staff->>API: POST /trpc/admission.confirmAdmission
    API->>DB: Create Student + Parent accounts
    API->>SMS: Send credentials to parent
    API-->>Staff: "Admission Complete"
```

### 2.9 Bulk CSV Import (Legacy Data Migration)
```mermaid
sequenceDiagram
    autonumber
    actor Staff as Admin Staff
    participant Web as Staff Dashboard
    participant API as Next.js API
    participant DB as PostgreSQL
    participant SMS as MSG91

    Staff->>Web: Clicks "Download Excel Template"
    Web->>API: GET /trpc/admission.downloadTemplate
    API-->>Web: Returns .xlsx with columns: Name, Father, Phone, Class, DOB

    Note over Staff: Staff fills 200 students from old register into Excel
    Staff->>Web: Clicks "Bulk Import" → Uploads filled Excel
    Web->>API: POST /trpc/admission.bulkImport

    API->>API: Parse CSV rows, validate phone numbers & dates
    
    loop For each row
        API->>DB: Check if parentPhone exists (sibling detection)
        alt Sibling Found
            API->>DB: Reuse existing ParentProfile
        else New Family
            API->>DB: CREATE User(PARENT) + ParentProfile
        end
        API->>DB: CREATE User(STUDENT) + StudentProfile
    end

    API-->>Web: { imported: 200, siblingsLinked: 15, errors: 3 }
    Web-->>Staff: "200 students imported. 15 siblings auto-linked. 3 rows had errors."

    Staff->>Web: Clicks "Send Mass SMS"
    Web->>API: Batch SMS trigger
    API->>SMS: Send credentials to all 200 parents
    SMS-->>API: Delivered: 197, Failed: 3
```

### 2.10 Library Book Issue/Return (Barcode Flow)
```mermaid
sequenceDiagram
    actor L as Librarian
    participant Web as Browser
    participant API as tRPC API
    participant DB as Database

    Note over L,DB: Book Issue (5 Seconds)
    L->>Web: Scans Student Barcode
    Web->>API: GET /trpc/library.searchStudent (barcode)
    API-->>Web: Returns Student Details
    
    L->>Web: Scans Book Barcode
    Web->>API: POST /trpc/library.issueBook
    API->>DB: INSERT BookIssue (dueDate = today + 14)
    API->>DB: UPDATE BookCopy (status = ISSUED)
    API-->>Web: Success (Green Check)

    Note over L,DB: Book Return & Fine
    L->>Web: Scans Book Barcode
    Web->>API: POST /trpc/library.returnBook
    API->>DB: Check if today > dueDate
    alt Overdue
        API->>DB: Calculate fine (e.g. ₹20)
        API-->>Web: Shows fine collection prompt
        L->>Web: Clicks "Add Fine to School Fees"
        Web->>API: POST /trpc/library.addFineToFees
        API->>DB: CREATE FeePayment (type: LIBRARY_FINE)
    end
    API->>DB: UPDATE BookCopy (status = AVAILABLE)
    API-->>Web: Return Successful
```

### 2.11 Inventory POS Billing (Cash/QR Checkout)
```mermaid
sequenceDiagram
    actor C as Store Manager
    participant Web as Browser
    participant API as tRPC API
    participant DB as Database
    participant RZP as Razorpay
    participant Print as Thermal Printer

    C->>Web: Enters Roll No / Phone
    Web->>API: Fetch Student/Parent details
    API-->>Web: Pre-fills billing info

    C->>Web: Selects "Size 32 Blazer" + "Class 5 Books"
    Web->>Web: Calculates Total (e.g. ₹5,200)

    C->>Web: Clicks "Generate Dynamic QR"
    Web->>API: POST /trpc/inventory.createOrder
    API->>RZP: Create Order (amount: 5200)
    RZP-->>API: returns qr_url
    API-->>Web: Displays QR on screen

    Note over C,RZP: Parent scans & pays via PhonePe
    RZP->>API: Webhook (payment.captured)
    API->>DB: UPDATE StoreSale (status=PAID)
    API->>DB: DECREMENT InventoryStock
    API-->>Web: Trigger Success Event via Pusher

    Web->>Print: Sends receipt format via JS `window.print()`
    Print-->>C: 80mm GST Thermal Receipt prints
```

### 2.12 Monthly Payroll Execution
```mermaid
sequenceDiagram
    actor P as Principal
    participant Web as Browser
    participant API as tRPC API
    participant DB as Database
    participant Bank as Bank Portal

    P->>Web: Clicks "Run Payroll (Aug 2026)"
    Web->>API: POST /trpc/payroll.runMonthlyPayroll
    
    loop For each Teacher
        API->>DB: Fetch TeacherAttendance (Aug)
        API->>DB: Fetch LeaveApplications (Approved)
        API->>API: Calculate PayableDays = (Total - Absent)
        API->>API: Gross = Base * (PayableDays / TotalDays)
        API->>API: Deduct PF(12%), TDS, Advances
        API->>DB: INSERT Payslip (NetSalary, pdfUrl)
    end

    API-->>Web: { processed: 45, totalPayout: ₹18.5L }

    P->>Web: Clicks "Download Bank NACH File"
    Web->>API: GET /trpc/payroll.exportBankFile
    API-->>Web: CSV file (Acct No, IFSC, Amount)
    
    P->>Bank: Uploads CSV to Corporate Banking
    Bank-->>P: Salaries deposited instantly
```

### 2.13 U-DISE+ / CBSE Compliance Report Generation Flow
```mermaid
sequenceDiagram
    actor SA as Super Admin
    participant Web as Browser
    participant API as tRPC API (compliance.ts)
    participant DB as Database
    participant Gen as Report Generator (Excel)

    SA->>Web: Clicks "Download U-DISE+ Report (2026-27)"
    Web->>API: POST /trpc/compliance.generateUDISE { academicYear }
    
    par Demographics Data
        API->>DB: Count Students by Class, Gender, Category
    and Staff Data
        API->>DB: Fetch Active Teachers (Qualifications, Joining Date)
    and Transport Data
        API->>DB: Fetch Active Buses (Fitness & Insurance expiry)
    end

    API->>API: Calculate Pupil-Teacher Ratio (PTR)
    API->>Gen: Aggregate data into CBSE/U-DISE standardized template
    Gen-->>API: returns base64_excel / S3_URL
    
    API->>DB: INSERT ComplianceExportLog (status: COMPLETED)
    API-->>Web: { downloadUrl: "https://r2.../report.xlsx" }
    
    Web-->>SA: Downloads "UDISE_Report_2026.xlsx"
```

---

## 3. White-Label Agency Deployment & Feature Gating

### 3.1 Single-Tenant Dedicated Deployment Model
Unlike a shared multi-tenant SaaS pool where all schools share one massive database, this ERP uses an **Agency Master Codebase Model**. 
For every client (school), the agency spins up a logically and physically dedicated deployment (e.g., `dps.schoolerp.com`) along with a dedicated mobile app on the Google Play Store.

**Architectural Advantages of this Model:**
- **Total Data Isolation & Security:** Each client gets their own database schema or database URL. A data breach in School A cannot compromise School B.
- **Dedicated Performance:** High traffic during result declaration in School A will not affect the performance of School B.
- **Instant Branding (White-Labeling):** The Master Codebase relies heavily on environment variables for instant white-labeling. When deploying, the CI/CD pipeline injects the school's unique identifiers.

```env
# Client-Specific White-Label Variables injected at Build Time
NEXT_PUBLIC_SCHOOL_NAME="Delhi Public School"
NEXT_PUBLIC_THEME_PRIMARY="#0f172a"
NEXT_PUBLIC_THEME_SECONDARY="#38bdf8"
NEXT_PUBLIC_LOGO_URL="https://r2.../dps_logo.png"
NEXT_PUBLIC_CLIENT_ID="DPS-1001"

# Database & Infrastructure
DATABASE_URL="postgresql://user:pass@host/dps_db?pgbouncer=true"
```
The React/Next.js UI dynamically applies these CSS variables and config values at runtime, giving the school a deeply personalized "Premium Custom App" experience.

### 3.2 Subscription-Based Feature Gating Architecture
While every deployment runs the identical Master Codebase (ensuring the agency only has one Git repository to maintain), feature access is controlled via a centralized `subscriptionPlan` logic assigned by the Master Admin.

**Plans:**
1. **BASE:** Core ERP (Admissions, Attendance, Results, Basic Fee Collection).
2. **PRO:** Adds Transport Management, Homework/Assignments, Notices.
3. **PREMIUM:** Unlocks AI Timetable Generator, AI Leave Suggester, Library POS, and Payroll.

**Gating Implementation (Middleware & tRPC):**
- **UI Gating:** If a school is on the `BASE` plan, the UI removes navigation links for premium modules (like AI Timetable).
- **API Gating (tRPC Middleware):**
  ```typescript
  const requirePremiumPlan = t.middleware(({ ctx, next }) => {
    if (ctx.school.subscriptionPlan !== 'PREMIUM') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Upgrade to Premium' });
    }
    return next();
  });
  export const premiumProcedure = protectedProcedure.use(requirePremiumPlan);
  ```
- **Upsell Prompts:** Certain buttons may remain visible but disabled, showing a locked icon. Clicking them triggers a modal: *"Upgrade to Premium to Unlock AI Features"*, driving B2B upselling for the agency.
- **Role Blocking:** Premium-only roles (e.g., `LIBRARIAN`, `STORE_MANAGER`) cannot be assigned by the Super Admin unless the school's subscription plan explicitly allows it.

---

## 4. Caching Strategy (Redis Key Layout)

| Key Pattern | Data | TTL | Invalidation |
|---|---|---|---|
| `erp:{schoolId}:config` | School settings, theme, grading scale | 24h | Super Admin updates settings |
| `erp:{classId}:timetable` | Weekly schedule JSON | 24h | Timetable edited or AI regenerated |
| `erp:{schoolId}:fee_summary` | Total collected, outstanding | 1h | New payment received |
| `erp:ratelimit:ai:{schoolId}` | AI request counter | Sliding 24h | Auto-expire |
| `erp:user_active:{userId}` | `{ isActive: boolean }` | 1h | Admin suspends/activates user |

---

## 5. Background Jobs & Cron Tasks

### 5.1 Daily Fee Reminder (08:00 AM)
1. Cron triggers `POST /api/jobs/fee-reminders`
2. Query: `SELECT * FROM FeePayment WHERE status = 'PENDING' AND dueDate < NOW()`
3. Group by parent → Batch SMS via MSG91
4. Log delivery status to `NotificationLog`

### 5.2 Weekly AI At-Risk Analysis (Sunday 02:00 AM)
1. Cron triggers `POST /api/jobs/at-risk-analysis`
2. For each student: Fetch weekly attendance + latest exam scores
3. Send to Gemini: "Identify students with attendance drops >20% or grade drops >15%"
4. Insert flags to `AlertLog` table
5. Super Admin sees alerts on Monday dashboard

### 5.3 Syllabus Lag Detection (Daily 10:00 PM)
1. Compare `Syllabus.topics` completed vs expected for current date
2. If >15% behind schedule → Flag teacher and suggest topic merging strategy

---

## 6. File Storage Architecture (Cloudflare R2)

### 6.1 Bucket Structure
```
school-erp-documents/
├── {schoolId}/
│   ├── profiles/           # User avatars
│   │   └── {userId}.webp
│   ├── homework/            # Assignment attachments
│   │   └── {homeworkId}/{filename}
│   ├── receipts/            # Fee receipt PDFs
│   │   └── {paymentId}.pdf
│   ├── vault/               # Document Vault (DigiLocker)
│   │   └── {studentId}/
│   │       ├── report-cards/
│   │       ├── certificates/
│   │       └── medical/
│   ├── expenses/            # Vendor receipt scans
│   │   └── {expenseId}/{filename}
│   └── admissions/          # Admission documents
│       └── {enquiryId}/
│           ├── birth-certificate.pdf
│           ├── aadhaar.pdf
│           ├── transfer-certificate.pdf
│           └── welcome-letter.pdf
```

### 6.2 Upload Strategy: Pre-signed URLs
1. Client requests upload URL from API: `GET /api/upload?filename=hw.pdf`
2. API generates a pre-signed R2 PUT URL (expires in 10 minutes)
3. Client uploads directly to R2 (bypasses server bandwidth)
4. Client sends the final R2 URL to the tRPC mutation

---

## 7. Realtime Communication (WebSockets)

### 7.1 Use Cases
- **Bus GPS Tracking:** GPS pushes location every 10 seconds → Parent sees bus moving on map
- **Live Notifications:** Fee paid → Accountant dashboard updates instantly
- **Leave Approval:** Admin approves → Teacher gets instant notification

### 7.2 Implementation (Pusher / Socket.io)
```typescript
// Server: Trigger event
await pusher.trigger(`school-${schoolId}`, 'fee-paid', {
  studentName: 'Rahul Kumar',
  amount: 5000,
  timestamp: new Date()
});

// Client: Subscribe
const channel = pusher.subscribe(`school-${schoolId}`);
channel.bind('fee-paid', (data) => {
  toast.success(`${data.studentName} paid ₹${data.amount}`);
});
```

---

## 8. CI/CD & Deployment Pipeline

### 8.1 Development Flow
1. Developer pushes to feature branch
2. GitHub Actions runs: `lint` → `typecheck` → `unit tests` → `build`
3. Vercel creates Preview Deployment (ephemeral URL)
4. Code review → Merge to `main`

### 8.2 Production Deployment
1. Merge triggers Vercel Production Build
2. Build phase runs `npx prisma migrate deploy`
3. If migration fails → Build aborted → Current production untouched (zero downtime)
4. If successful → Vercel swaps to new build globally

### 8.3 Database Rollback
- Neon.tech provides branch-based database snapshots
- If migration corrupts data → Create new branch from pre-migration snapshot → Point `DATABASE_URL` to recovered branch
