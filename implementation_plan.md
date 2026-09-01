# 🏫 School ERP Portal — Implementation Plan

## Overview

Ek **production-ready, multi-tenant School ERP SaaS Platform** banana hai jo AI-powered features ke saath existing market solutions (Teachmint, Fedena, Vidyalaya) se behtar ho. 

**Approach**: Pehle **Phase 1 mein ek single-school MVP** banayenge, phir **Phase 2 mein multi-tenant SaaS** mein convert karenge.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend (Web)** | Next.js 14+ (App Router) | Available for ALL roles (Admin, Teacher, Parent, Student) |
| **Mobile App** | React Native (Expo) | Available for ALL roles (Admin, Teacher, Parent, Student) |
| **UI Library** | shadcn/ui + Tailwind CSS | Premium, accessible UI components |
| **Backend API** | Next.js API Routes + tRPC | Type-safe, fullstack |
| **Database** | PostgreSQL (via Supabase/Neon) | Relational data, multi-tenant ready |
| **ORM** | Prisma | Type-safe DB queries |
| **Auth** | NextAuth.js v5 (Auth.js) | Role-based authentication |
| **File Storage** | Cloudflare R2 / AWS S3 | Documents, photos, receipts |
| **AI Engine** | Gemini API / OpenAI API | Smart features |
| **Payment** | Razorpay / Stripe | Fee collection |
| **Realtime** | Pusher / Socket.io | Live notifications |
| **Deployment** | Vercel (Frontend) + Railway/Supabase (DB) | Scalable cloud hosting |
| **Email/SMS** | Resend (Email) + Twilio/MSG91 (SMS) | Communication |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│    Next.js 14 (Web)  +  React Native (Mobile)    │
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

---

## 📊 Database Schema (Core Tables)

### Multi-Tenant Foundation
```
School (tenant)
├── id, name, logo, address, contact, subscription_plan
├── academic_year_start, academic_year_end
└── settings (JSON - school-specific configs)

User
├── id, school_id (FK), email, phone, password_hash
├── role (MASTER_ADMIN | SUPER_ADMIN | TEACHER | STUDENT | PARENT | DRIVER | ACCOUNTANT)
├── profile_image, is_active
└── created_at, updated_at
```

### Academic Module
```
Class
├── id, school_id, name (e.g., "10th-A"), section
└── academic_year

Subject
├── id, school_id, name, code
└── class_id (FK)

ClassTeacher (mapping)
├── teacher_id, class_id, subject_id
├── is_class_teacher (bool)
└── assigned_by (super_admin_id)

Timetable
├── id, class_id, subject_id, teacher_id
├── day_of_week, start_time, end_time, room
└── is_ai_generated (bool)

AcademicSchedule
├── id, school_id, title, date, type (EXAM | HOLIDAY | EVENT)
└── description

Syllabus
├── id, class_id, subject_id, academic_year
├── topics (JSON array of {topic_name, expected_hours, is_completed, completion_date})
└── uploaded_by (super_admin_id or teacher_id)
```

### Attendance & Results
```
Attendance
├── id, student_id, class_id, date
├── status (PRESENT | ABSENT | LATE | HALF_DAY)
└── marked_by (teacher_id)

Exam
├── id, school_id, name, class_id, subject_id
├── date, total_marks, passing_marks
└── type (UNIT_TEST | MID_TERM | FINAL)

Result
├── id, exam_id, student_id
├── marks_obtained, grade, remarks
└── uploaded_by (teacher_id)

Homework
├── id, class_id, subject_id, teacher_id
├── title, description, due_date
├── attachments (JSON array)
└── created_at
```

### Transportation
```
Vehicle
├── id, school_id, bus_number, capacity
└── is_active

Route
├── id, school_id, name, vehicle_id
├── stops (JSON array of {name, lat, lng, time})
└── driver_id, conductor_id

TransportStaff
├── id, user_id, license_number
├── contact, emergency_contact
└── assigned_vehicle_id
```

### Fee & Finance
```
FeeStructure
├── id, school_id, class_id, academic_year
├── fee_type (TUITION | TRANSPORT | LIBRARY | SPORTS)
├── amount, due_date, frequency (MONTHLY | QUARTERLY | ANNUAL)
└── late_fee_per_day

FeePayment
├── id, student_id, fee_structure_id
├── amount_paid, payment_date, payment_method
├── transaction_id, receipt_number
├── status (PAID | PARTIAL | PENDING | OVERDUE)
└── online_receipt_url

Expense
├── id, school_id, category, amount
├── description, date, approved_by
└── receipt_attachment
```

### Communication
```
Notice
├── id, school_id, title, content
├── target_roles (JSON array), target_classes (JSON array)
├── published_by (super_admin_id)
├── is_published, publish_date
└── attachments

LeaveApplication
├── id, user_id, leave_type (SICK | CASUAL | PERSONAL)
├── role (TEACHER | STUDENT)
├── from_date, to_date, reason
├── status (PENDING | APPROVED | REJECTED)
├── approved_by, ai_substitute_suggestion (JSON)
└── created_at
```

---

## 🔐 Role-Based Access Control (RBAC)

```
MASTER_ADMIN (Developer - Tum)
├── Create/Manage Schools
├── Assign Super Admins
├── View all schools' analytics
├── Manage subscriptions
└── System-wide settings

SUPER_ADMIN (Principal)
├── Full school access
├── Assign all roles
├── Class-Teacher mapping
├── Publish notices & Define Syllabus
├── Academic schedule management
├── View all reports
├── Fee structure setup
└── Transportation management

TEACHER
├── Own classes' attendance
├── Upload results/homework
├── Update Syllabus Progress
├── View own schedule
├── Apply for leave
├── View student profiles (assigned classes only)
└── Cannot modify other teachers' data

STUDENT
├── View own attendance, results, schedule
├── View homework & notices
├── View Syllabus and Course Progress
├── View transportation details
├── **Apply for Leave online** (Pre-inform school)
├── Profile dashboard (read-only mostly)
└── Cannot view other students' data

PARENT
├── View child's all info (attendance, results, fees)
├── View Syllabus and Course Progress
├── Make fee payments
├── Download receipts
├── View teacher/transport info
├── View notices & approve child's leave
└── Cannot modify any data

TRANSPORT_STAFF
├── Update own profile
├── View assigned route
├── Mark vehicle status
└── Cannot access academic data

ACCOUNTANT
├── Fee collection management
├── Generate receipts
├── Expense management
├── Financial reports
├── Cannot access academic results
└── Cannot modify student/teacher data
```

---

## 🎨 UI/UX Strategy (Ultra User-Friendly)

Kyunki system ko alag-alag background ke log use karenge (Drivers, Parents, Teachers), UI/UX top priority hai:

1. **Universal Access (Web + Mobile):** Chahe Admin ho, Teacher, Student ya Parent — **sabke paas choice hogi**. Jo chahe Web portal use kare laptop par, jo chahe Mobile App use kare phone par. Data dono jagah instantly sync hoga.
2. **Role-Specific Clutter-Free Dashboards:** Har user ko sirf apna kaam dikhega. Driver ko marks nahi dikhenge, bas Route aur map dikhega.
3. **Language Toggle (Vernacular):** Parents aur Drivers ke liye app ko Hindi/regional language mein switch karne ka 1-click option.
4. **Icon-Driven Design:** Text kam aur bade, clear icons zyada. (e.g., Leave ke liye Bada Calendar Icon, Fee ke liye Rupee Icon).
5. **One-Click Actions:** Teachers ke liye "Mark All Present" ya "Remind All Unpaid Parents" jaise one-click buttons taaki unka time bache.

---

## 🤖 AI Features (Market Differentiator)

### Phase 1 AI (MVP)
1. **Smart Timetable Generator**
   - Input: Teachers, subjects, classes, constraints
   - Output: Conflict-free optimal timetable
   - Algorithm: Constraint satisfaction + Gemini API for optimization

2. **Leave Substitute Suggester**
   - Teacher leave pe AI dekhega kon teacher free hai us period mein
   - Same subject preference, workload balancing

3. **Smart Notices**
   - AI-assisted notice drafting (Gemini API)
   - Auto-translate to Hindi/regional languages

### Phase 2 AI & Unique Features (Real Problem Solvers)
4. **Auto Fee Reconciliation (Zero Manual Entry):** Schools me fees UPI/NEFT se aati hai, par accountant ko pata nahi chalta kisne pay kiya. Hum **Razorpay SmartCollect** use karenge, jisse har bache ko ek unique "Virtual UPI ID / Bank Account" milega. Jaise hi parent pay karega, system automatically us bache ki fee 'Paid' mark kar dega.
5. **Holistic Behavioral & Skill Mapping (Not just Marks):** 
   *Kaise kaam karega:* Pura saal teacher bache ko chote-chote predefined tags de sakti hai app me (jaise: "Leadership", "Helpful", "Distracted", "Creative Problem Solver"). Saal ke end me AI in sab tags aur remarks ko analyze karke ek **Professional Narrative Report** generate karega. Isse parents ko sirf "Maths: 85/100" nahi, balki bache ki personality aur soft skills ki deep samajh milegi. Ye conventional report cards se bahut advance aur professional lagega.
6. **Smart Syllabus Progress Tracker:** Admin ya Teacher saal ke shuru me Syllabus (topics) dalenge. Jise Parents aur Students app me dekh sakenge. Teacher har roz update karegi ki kya padhaya. Agar syllabus peeche ho gaya, to AI khud suggest karega ki aage aane wali classes me 2 topics ko kaise merge karke padhayein taaki exam se pehle syllabus khatam ho.
7. **School Document Vault (DigiLocker Style):** Parents ko physical files sambhalne ki zaroorat nahi. Bache ka report card, transfer certificate, medical records, sab hamesha ke liye cloud par cryptographically secure (verified by school) save rahenge.

### 🌟 Game-Changer Additions (Zero/Low Cost for Tier 2/3 Cities)
Tumhara analysis bilkul sahi hai. WhatsApp API aur SMS mehengay hote hain, aur QR scanning practical nahi hai. Hum aise features daalenge jinka cost almost zero ho par impact bahut bada ho:

8. **Professional Bulk SMS Integration (DLT Approved):** School ek professional entity hai, isliye communication formal hona zaroori hai. Hum MSG91 ya Twilio ke through DLT-approved transactional SMS API integrate karenge. Isse fees reminders, absent alerts, aur emergency notices parents ko professional tarike se normal text SMS me jayenge (Sender ID: SCH-ERP).
9. **Offline-First App (Bina Internet ke Kaam):** Chhote shehron me school ke andar ya classes me hamesha network nahi aata. Teacher ka app **Offline** kaam karega. Teacher bina internet ke attendance lagayegi, marks chadhaayegi. Jaise hi phone internet ke range me aayega, data automatically server par sync ho jayega. 
   *(Technical Details for Offline Sync: Cache aur Data conflict rokne ke liye hum "Sync Queue" aur "Timestamp-based resolution" use karenge. Server hamesha check karega ki latest data kaunsa hai. Attendance specific Date aur Class ke hisaab se lock hoti hai, isliye galat data override hone ka chance zero hota hai.)*
10. **AI "At-Risk" Early Warning System:** AI background me student ki attendance (sudden drops), homework completion, aur test marks ko analyze karega. Agar koi bacha achanak se perform karna band kar de ya absent rehne lage, to Principal/Counselor ko ek **"Early Warning Alert"** chala jayega. Jisse school time par bache ki help kar sake.

---

## 📁 Project Structure

```
erp-portal/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # Login, Register pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/      # Protected dashboard routes
│   │   │   ├── master/       # Master Admin Panel
│   │   │   ├── admin/        # Super Admin (Principal) Panel
│   │   │   ├── teacher/      # Teacher Panel
│   │   │   ├── student/      # Student Portal
│   │   │   ├── parent/       # Parent Portal
│   │   │   ├── staff/       # Driver Panel
│   │   │   └── accountant/   # Account Office Panel
│   │   ├── api/              # API Routes
│   │   │   └── trpc/
│   │   ├── layout.tsx
│   │   └── page.tsx          # Landing Page
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── dashboard/        # Dashboard widgets
│   │   ├── forms/            # Form components
│   │   ├── tables/           # Data tables
│   │   └── charts/           # Analytics charts
│   ├── lib/
│   │   ├── auth.ts           # NextAuth config
│   │   ├── db.ts             # Prisma client
│   │   ├── ai/               # AI service functions
│   │   │   ├── timetable-generator.ts
│   │   │   ├── leave-suggester.ts
│   │   │   └── notice-writer.ts
│   │   ├── payment/          # Razorpay integration
│   │   └── utils.ts
│   ├── server/
│   │   ├── routers/          # tRPC routers
│   │   │   ├── school.ts
│   │   │   ├── user.ts
│   │   │   ├── class.ts
│   │   │   ├── attendance.ts
│   │   │   ├── result.ts
│   │   │   ├── fee.ts
│   │   │   ├── transport.ts
│   │   │   ├── notice.ts
│   │   │   └── leave.ts
│   │   └── trpc.ts
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript types
│   └── styles/
│       └── globals.css
├── public/
│   └── assets/
├── .env
├── package.json
├── next.config.js
└── tailwind.config.ts
```

---

## 🚀 Phased Implementation Plan

### Phase 1: Foundation & Core MVP (Weeks 1-6)

#### Week 1-2: Project Setup & Auth
- [ ] Next.js project setup with TypeScript
- [ ] Prisma schema design & database setup (Supabase/Neon)
- [ ] NextAuth.js with role-based authentication
- [ ] Login/Register pages with premium UI
- [ ] Role-based middleware & route protection
- [ ] shadcn/ui component library setup

#### Week 3-4: Super Admin (Principal) Panel
- [ ] Dashboard with school overview stats
- [ ] Class management (CRUD)
- [ ] Teacher management & class-teacher assignment
- [ ] Student enrollment & management
- [ ] Parent account linking
- [ ] Notice board (create, publish, target by role/class)
- [ ] Academic schedule/calendar
- [ ] AI Timetable Generator (basic version)

#### Week 5-6: Teacher Panel
- [ ] Teacher dashboard
- [ ] Attendance marking (by class)
- [ ] Homework creation & management
- [ ] Result/marks upload
- [ ] Leave application system
- [ ] AI leave substitute suggestion
- [ ] Class schedule view

---

### Phase 2: Student, Parent & Support Roles (Weeks 7-10)

#### Week 7-8: Student Portal
- [ ] Student dashboard with profile
- [ ] Attendance view with calendar
- [ ] Results & report cards
- [ ] Homework list & submission
- [ ] Timetable view
- [ ] Notice board view
- [ ] Transportation details

#### Week 9-10: Parent Portal & Mobile App Foundations
- [ ] Parent dashboard (child-centric view)
- [ ] Student Leave Application system (apply & track)
- [ ] All child information access
- [ ] Fee payment integration (Razorpay)
- [ ] Online receipt generation & download
- [ ] Transportation tracking
- [ ] Driver/Conductor panel (Mobile friendly UI)
- [ ] Account Office panel (fee management, reports)
- [ ] **React Native Expo Setup** for Student/Parent Mobile App

---

### Phase 3: AI Enhancement & Polish (Weeks 11-14)

- [ ] Advanced AI timetable optimization
- [ ] Performance analytics & prediction
- [ ] Smart notifications system
- [ ] AI-powered report card generation
- [ ] Attendance anomaly alerts
- [ ] Mobile responsive optimization
- [ ] PWA (Progressive Web App) setup
- [ ] Email/SMS notification system

---

### Phase 4: Multi-Tenant SaaS (Weeks 15-18)

- [ ] Master Admin panel for managing multiple schools
- [ ] School onboarding flow
- [ ] Subscription/pricing management
- [ ] School-specific customization (logo, colors, name)
- [ ] Data isolation between schools
- [ ] Landing page for marketing
- [ ] Payment gateway for subscriptions

---

## 💰 Cost Estimate (Monthly)

| Service | Free Tier | Production |
|---|---|---|
| Vercel (Hosting) | Free (hobby) | $20/mo |
| Supabase (DB) | Free (500MB) | $25/mo |
| Cloudflare R2 (Files) | Free (10GB) | ~$5/mo |
| Gemini API (AI) | Free tier generous | ~$10-50/mo |
| Razorpay (Payments) | 2% per txn | 2% per txn |
| Resend (Email) | Free (100/day) | $20/mo |
| Domain | - | $10-15/year |
| **Total (Start)** | **~$0-5/mo** | **~$80-120/mo** |

---

## 🏆 Market Providers Se Kaise Better?

| Feature | Teachmint/Fedena | Tumhara ERP |
|---|---|---|
| AI Timetable | ❌ Manual | ✅ AI-generated, conflict-free |
| Leave Management | Basic approval | ✅ AI substitute suggestion |
| UI/UX | Outdated | ✅ Modern, premium (shadcn/ui) |
| Notices | Basic | ✅ AI-drafted, multi-language |
| Reports | Template-based | ✅ AI-generated insights |
| Pricing | ₹50-200/student/year | ✅ Competitive, flexible |
| Customization | Limited | ✅ Per-school branding |
| Offline Receipts | Limited | ✅ Both online & offline |

---

## User Review Required

> [!IMPORTANT]
> **Yeh ek serious, large-scale project hai.** Tumhe consistently kaam karna hoga. Main har step mein tumhare saath hoon — design se lekar deployment tak. Lekin commitment chahiye ki tum har week progress karoge.

> [!WARNING]  
> **Agar tum beginner ho (HTML/CSS basics)**: Pehle Next.js aur React seekhna padega (2-4 weeks extra). Main tumhe guide karunga, lekin basics samajhna zaroori hai.
> 
> **Agar tum intermediate/advanced ho**: Seedha building start kar sakte ho.

## Open Questions

1. **School ka naam kya rakhna hai?** (MVP ke liye ek test school chahiye)
2. **Regional language support chahiye?** (Hindi, Urdu, etc.)
3. **Mobile app bhi chahiye ya pehle sirf web?** (PWA se web hi mobile jaisa kaam karega)
4. **Koi specific school hai jiske liye pehle bana rahe ho?** (Real data milega testing ke liye)
5. **Budget kitna hai monthly hosting/services ke liye?**

---

## Verification Plan

### Automated Tests
- Unit tests for API routes (Jest/Vitest)
- E2E tests for critical flows (Playwright)
- `npm run build` for compilation check

### Manual Verification
- Each role login & feature testing
- Payment gateway sandbox testing
- AI feature accuracy testing
- Mobile responsiveness check
- Load testing for concurrent users

---

**Kya tum ready ho shuru karne ke liye? Approve karo aur hum Phase 1, Week 1 se start karenge!** 🚀
