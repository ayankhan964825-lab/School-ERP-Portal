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
- Each panel is a separate route group under `(dashboard)/`

### Layer 2: API Layer
- **tRPC + Next.js API Routes** — 9 domain routers (school, user, class, attendance, result, fee, transport, notice, leave)
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

---

## 3. Data Isolation & Multi-Tenancy

### 3.1 Pool Model (Shared DB, Shared Schema)
Every table has `schoolId` FK. All queries automatically filter by tenant.

### 3.2 Enforcement Strategies
**Option A — Prisma Client Extension (Application Level):**
```typescript
const tenantPrisma = prisma.$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, schoolId: session.user.schoolId };
        return query(args);
      }
    }
  }
});
```

**Option B — PostgreSQL Row-Level Security (Database Level):**
```sql
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation" ON "Attendance"
FOR ALL USING (school_id = current_setting('app.current_school_id')::uuid);
```

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
│   └── expenses/            # Vendor receipt scans
│       └── {expenseId}/{filename}
```

### 6.2 Upload Strategy: Pre-signed URLs
1. Client requests upload URL from API: `GET /api/upload?filename=hw.pdf`
2. API generates a pre-signed R2 PUT URL (expires in 10 minutes)
3. Client uploads directly to R2 (bypasses server bandwidth)
4. Client sends the final R2 URL to the tRPC mutation

---

## 7. Realtime Communication (WebSockets)

### 7.1 Use Cases
- **Bus GPS Tracking:** Driver pushes location every 10 seconds → Parent sees bus moving on map
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
