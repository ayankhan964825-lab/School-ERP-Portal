# UI/UX Design System — School ERP Portal

> **Version:** 2.0 | **Status:** Final Draft
> **UI Framework:** shadcn/ui + Radix UI + Tailwind CSS
> **Animation:** Framer Motion

---

## 1. Five Core Design Principles (from implementation plan lines 255-264)

These 5 rules are NON-NEGOTIABLE. Every UI decision must pass through this filter.

### Principle 1: Universal Access (Web + Mobile)
> "Chahe Admin ho, Teacher, Student ya Parent — sabke paas choice hogi. Jo chahe Web portal use kare laptop par, jo chahe Mobile App use kare phone par. Data dono jagah instantly sync hoga."

- **Web:** Next.js 14 responsive web app (works on laptops, tablets)
- **Mobile:** Flutter app (native iOS + Android with Isar offline DB)
- **Sync:** Same tRPC API backend → data is always consistent

### Principle 2: Role-Specific Clutter-Free Dashboards
> "Har user ko sirf apna kaam dikhega. Driver ko marks nahi dikhenge, bas Route aur map dikhega."

- Irrelevant features are **INVISIBLE** (removed from DOM), not just disabled/greyed out
- Each role gets a completely different navigation structure
- No feature overlap between roles unless explicitly defined (e.g., both Student and Parent can view attendance)

### Principle 3: Language Toggle (Vernacular)
> "Parents aur Drivers ke liye app ko Hindi/regional language mein switch karne ka 1-click option."

- 1-click toggle in the top navigation bar
- Default: English
- Supported: Hindi (and other regional languages per school config)
- Implementation: `next-intl` or `i18next` library
- All static UI text stored in JSON translation files

### Principle 4: Icon-Driven Design
> "Text kam aur bade, clear icons zyada. Leave ke liye Bada Calendar Icon, Fee ke liye Rupee Icon."

- Primary icon library: **Lucide Icons** (integrated with shadcn/ui)
- Every navigation item has a prominent icon
- Mobile views: Icons are 24-32px with minimal text
- Driver panel: Extra large icons (40px+) for use in moving vehicles

### Principle 5: One-Click Actions
> "Teachers ke liye 'Mark All Present' ya 'Remind All Unpaid Parents' jaise one-click buttons taaki unka time bache."

- Teacher: "Mark All Present" button (then tap only absent students)
- Super Admin: "Remind All Unpaid Parents" (triggers bulk SMS)
- Super Admin: "Generate AI Timetable" (1-click AI call)
- Parent: "Pay Now via UPI" (immediate payment intent)

### Principle 6: Client vs Server Separation (Performance First)
> "Fast loading ke liye, heavy components server pe rahenge aur sirf buttons/forms client pe."

- All Layouts, sidebars, and data-fetching pages are **Server Components** (Zero JS).
- Interactive UI (Forms, Modals, DataTables, Clickable Graphs) are **Client Components** (`"use client"`).
- This ensures the UI remains as fast as a static site (like Astro) while retaining full React capabilities.

---

## 2. Component Library & Design Tokens

### 2.1 shadcn/ui Components Used
From the implementation plan (line 17), we use shadcn/ui for all base components:

| Component | Usage |
|---|---|
| `Button` | All CTA actions (Submit, Pay, Mark Present) |
| `Input` | Text fields in all forms |
| `Card` | Dashboard metric widgets, student cards |
| `Table` (DataTable) | Student lists, fee records, attendance records |
| `Dialog / Modal` | Confirmation dialogs, form popups |
| `Select / Dropdown` | Class selector, role filter, subject picker |
| `Toast (Sonner)` | Success/Error/Offline notifications |
| `Skeleton` | Loading placeholders |
| `Tabs` | Section navigation within panels |
| `Calendar` | Attendance calendar, exam schedule |
| `Badge` | Status indicators (PAID, PENDING, ABSENT) |
| `Avatar` | User profile pictures |
| `Sheet` | Mobile slide-out menus |
| `Accordion` | FAQ, expandable sections |

### 2.2 Dynamic Theming (CSS Variables for Per-School Branding)
From implementation plan line 439: "School-specific customization (logo, colors, name)"

```css
@layer base {
  :root {
    /* Neutral Base */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --card: 0 0% 100%;
    
    /* Dynamic Per-Tenant Primary (injected from School.settings) */
    --primary: 221.2 83.2% 53.3%;     /* Default: Trust Blue */
    --primary-foreground: 210 40% 98%;

### 2.3 Responsive Breakpoints (Mobile-First Strategy)
To ensure the ERP portal works flawlessly on Windows, iOS, iPad, Tablets, and Mobile phones, we enforce a strict **Mobile-First** design using Tailwind CSS breakpoints. Retrofitting responsiveness is difficult, so all components MUST be designed for mobile first, then scaled up.

- **Base (Mobile/iOS/Android):** `< 640px`. UI is stacked (1 column). Sidebars become Hamburger menus (`Sheet` component).
- **`sm:` (Large Phones/Small Tablets):** `>= 640px`.
- **`md:` (iPad/Tablets):** `>= 768px`. UI shifts to 2 columns. Sidebar becomes visible as an icon-only dock.
- **`lg:` (Laptops/Windows):** `>= 1024px`. Full dashboard view. Sidebar is fully expanded with text. Grid becomes 3-4 columns.
- **`xl:` (Desktops):** `>= 1280px`. Maximum width (`max-w-7xl`).

*Rule:* Never write `flex` without considering mobile. Always write `flex-col md:flex-row`.
    /* Semantic Status Colors */
    --success: 142.1 76.2% 36.3%;      /* PRESENT / PAID */
    --warning: 38 92% 50%;              /* LATE / PARTIAL */
    --destructive: 0 84.2% 60.2%;      /* ABSENT / OVERDUE */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode overrides */
  }
}
```

### 2.3 Typography
- **Primary Font:** `Inter` or `Geist` — clean, highly legible for data-heavy tables
- **Headings:** `font-bold tracking-tight` — establishes visual hierarchy
- **Data Tables:** `tabular-nums` — numbers align perfectly in columns
- **Body Text:** `text-sm` (14px) for density, `text-base` (16px) for readability

### 2.4 Spacing Grid (4px Base)
- Margins/Padding: `p-2` (8px), `p-4` (16px), `p-6` (24px)
- Border Radius: `rounded-md` (6px) for buttons/inputs, `rounded-xl` (12px) for cards
- Shadows: Soft tinted shadows `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`

---

## 3. Role-Specific Dashboard Layouts — All 9 Panels

### 3.1 MASTER_ADMIN Dashboard (Desktop Only)
**Layout:** Full-width sidebar navigation (persistent left)

**Navigation Items:**
- 📊 Dashboard (Global overview)
- 🏫 Schools (List, Create, Suspend)
- 💳 Billing (Subscription management)
- ⚙️ Settings (System-wide configs)

**Dashboard Widgets:**
- Total Schools (card with sparkline)
- Total Users across all schools
- Monthly Recurring Revenue (MRR)
- Schools by Plan (pie chart: Free/Basic/Premium)
- Recent Activity Feed (which schools signed up, who paid)

---

### 3.2 SUPER_ADMIN (Principal) Dashboard
**Layout:** Collapsible sidebar + Main content area

**Navigation Items:**
- 📊 Dashboard (School overview)
- 🏛️ Classes (CRUD)
- 👨‍🏫 Teachers (Management + Assignment)
- 👨‍🎓 Students (Enrollment)
- 👨‍👩‍👦 Parents (Account linking)
- 📌 Notice Board (Create + Publish)
- 🗓️ Timetable (AI Generator)
- 📚 Syllabus (Define + Track)
- 💰 Fee Structure (Define)
- 🚌 Transport (Vehicles + Routes)
- 📅 Calendar (Academic Schedule: Exams, Holidays, Events)
- 📊 Reports (All analytics)

**Dashboard Widgets:**
- Total Students enrolled
- Total Teachers active
- Today's Attendance % (school-wide)
- Today's Fee Collection ₹ (online + offline)
- Pending Leave Approvals count
- AI At-Risk Alerts (students flagged by AI)
- Syllabus Progress Summary (behind/on-track/ahead)

**Report Card Designer UI:**
- Drag & Drop layout builder (Header, Logo, Grading Scale, Remarks).
- Preview mode (switch between CBSE 8-point / State Board scales).
- 1-Click "Bulk Generate Class PDF" button.

**Transportation Management UI (Admin Focus):**
- **Transport Staff Directory:** A secure HR table exclusively for Drivers and Conductors. 
  - Columns: `Name`, `Phone`, `Role`, `License No`, `Aadhar`, `Police Verification Status`.
  - Actions: "Upload Documents", "Suspend Staff".
- **Vehicle Fleet View:** List of buses with visual indicators (Green/Red) for compliance.
  - Columns: `Bus No`, `Capacity`, `Insurance Expiry`, `Fitness Certificate Expiry`.
  - Alerts: Red badge if any expiry is < 30 days away.
- **Route Builder (Drag & Drop):** 
  - Admin assigns a `Vehicle`, a `DRIVER`, and a `CONDUCTOR` to a Route. 
  - Map UI to add stops with Expected Timings and calculate total route duration.
  - Validations: Prevents assigning more students to the route than the Vehicle's capacity.
- **Parent Visibility Toggle & Filtering:** 
  - System automatically ensures parents NEVER see the driver's HR documents.
  - Auto-exposes only essential data (Driver Name, Phone, Bus No, Route Name) to the Parent Dashboard for emergency contact.

---

### 3.3 TEACHER Dashboard (Mobile-First)
**Layout:** Bottom tab navigation (Home, Classes, Messages, Profile)

**Navigation Items:**
- 🏠 Home (Today's schedule + action cards)
- 📋 Attendance (Mark by class)
- 📝 Homework (Create + Track)
- 📊 Results (Upload marks)
- 📚 Syllabus (Update progress)
- 🗓️ Schedule (Own timetable view)
- 📤 Leave (Apply for leave)

**Dashboard (Home Tab):**
- Today's schedule timeline (which class at which time)
- Action cards based on time of day:
  - 8:00 AM: "Mark Attendance: 10-A" (huge CTA)
  - 2:00 PM: "Upload Math Test Results"
- Quick stats: Classes today, Total students, Pending homework reviews

**Attendance Marking UI:**
- Photo grid of students (40 students = 5x8 grid)
- All default to GREEN (Present)
- Teacher taps absent students → turns RED
- "Mark All Present" button at top
- Submit button at bottom
- Offline: Shows toast "Saved Offline"

---

### 3.4 STUDENT Dashboard
**Layout:** Mobile-friendly with tabs (Home, Academics, Info)

**Navigation Items:**
- 🏠 Dashboard (Profile + Quick Summary)
- 📋 Attendance (Calendar view)
- 📊 Results (Report cards)
- 📝 Homework (List + Submission)
- 🗓️ Timetable (Weekly grid)
- 📚 Syllabus (Progress view)
- 📌 Notices (School announcements)
- 🚌 Transport (Bus/Route info)
- 📤 Leave (Apply for leave)

**Dashboard Widgets:**
- Student profile card (photo, name, class, roll number)
- Attendance % this month
- Upcoming exams
- Pending homework count
- Latest notice preview

---

### 3.5 PARENT Dashboard (Mobile-First)
**Layout:** Bottom tab navigation (Home, Fees, Academics, More)

**Navigation Items:**
- 🏠 Dashboard (Child overview)
- 📋 Attendance (Child's calendar)
- 📊 Results (Child's marks + AI report)
- 💳 Fees (Pay + Download receipts)
- 📚 Syllabus (Course progress)
- 🚌 Transport (Bus tracking)
- 👨‍🏫 Teachers (Contact info)
- 📌 Notices (Announcements)
- ✅ Leave (Approve child's leave)
- 🔒 Document Vault (Report cards, TCs, Medical records)

**Dashboard Widgets:**
- **Child Selector:** If parent has multiple children → horizontal scroll carousel at top
- Quick Summary: Attendance %, Pending Fees ₹, Last Exam Marks
- Notification bell (fee reminders, notice alerts, leave updates)
- "No Child Linked" edge case → Show setup wizard

**Fee Payment Flow UI:**
- Massive card showing: "₹5,000 Due in 3 Days"
- Fee breakdown: Tuition ₹3000 + Transport ₹1000 + Library ₹500 + Late Fee ₹500
- Huge "Pay Now via UPI" button
- Payment methods: UPI, Debit/Credit Card, NetBanking
- Payment History list with "Download Receipt (PDF)" links

---

### 3.6 [REMOVED] Transport Dashboard
*The dedicated Driver Dashboard has been removed. Transportation is now securely managed via the Admin Dashboard (TransportStaff profiles), and basic details are exposed to the Parent Dashboard.*

### 3.7 ACCOUNTANT Dashboard
**Layout:** Desktop sidebar + Data-heavy tables

**Navigation Items:**
- 💰 Collections (Today's dashboard)
- 🧾 Receipts (Generate + Print)
- 💸 Expenses (Add + Track)
- 🤖 SmartCollect (Auto-reconciliation view)
- 📊 Reports (Financial analytics)

**Dashboard Widgets:**
- Today's Collections (online + offline total)
- Pending Dues Overview (total outstanding ₹)
- Class-wise Collection Summary (bar chart)
- Recent Payments list (last 10 transactions)

**SmartCollect View:**
- Matched Payments (auto-reconciled by Razorpay webhook)
- Unmatched/Pending (needs manual resolution)
- Edge case: Wrong Virtual Account → Flag for admin

**Payroll Management UI:**
- "Run Monthly Payroll" CTA (bulk calculation based on attendance).
- Salary Sheet table (Base, HRA, PF Deductions, Net Payable).
- "Export Bank NACH File" button (downloads CSV/Excel).

---

### 3.8 ADMIN_STAFF (Front Office / Admission) Dashboard
**Layout:** Desktop sidebar + Clean form-focused layout

**Navigation Items:**
- 📝 New Admission (Multi-step form)
- 📋 Admission Register (Searchable list)
- 🔍 Enquiries (Pre-admission tracking)
- 🔗 Sibling Management (Link/Unlink)
- 🖨️ Credentials (Generate & Print)

**Dashboard Widgets:**
- Today's Admissions Count (completed today)
- Pending Enquiries (status: ENQUIRY or APPLIED)
- Recent Admissions list (last 10)
- Quick Action: "New Admission" (huge CTA button)

**Omni-Channel Admission UI (3 Modes):**

**1. High-Speed Data Entry Form (For Staff Manual Entry):**
*Designed for extreme speed. Staff can enter a full admission in <30 seconds.*
- **Single Page Layout:** No wizard. All fields are on one clean, scroll-free view.
- **Keyboard-Only Navigation:** Fully optimized for `Tab` index. Dropdowns support auto-complete typing. No mouse required.
- **Smart Defaults:** Admission Date defaults to today. Academic Year defaults to current. State/City pre-filled.
- **Instant Sibling Auto-Fill:** Typing a 10-digit number in the Parent Phone field instantly auto-fills Father Name, Mother Name, and Address if the parent already exists (no search button needed).
- **Optional Documents:** Document upload (Birth Cert, Aadhaar) is moved to an optional step at the end. Staff can skip and upload later.
- **Instant Admission Fee:** End of form has "Fee Amount", "Paid Amount", and "Method" (Cash/Cheque/UPI). If Paid < Total, balance goes to "Pending Dues". Includes "Discount Amount" and "Reason" fields for waivers.
- **Submit & Auto-Reset:** Pressing `Enter` at the end submits the form, shows a 3-second success toast ("Admitted! ID: STD101"), generates receipt, and instantly clears the form for the next entry without a page reload.

**2. QR Code "Pending Enquiries" Queue (For Parent Self-Serve):**
- Real-time updating list of parents who scanned the QR at reception.
- Click "Review" → Opens the High-Speed form pre-filled with the parent's data. Staff just selects Class, takes fee, and clicks Approve.

**3. Bulk Import UI (Legacy Registers):**
- Huge "Download Template (.xlsx)" button.
- Drag & Drop zone for the filled `.xlsx` file.
- Shows preview table of parsed students with errors highlighted in red (e.g., missing phone number).
- "Import & Send SMS" final button.

**Missing Documents Widget:**
- A small dashboard card showing: "12 Students have missing documents". Click to view list and upload missing TC/Aadhaar.

**Sibling Management View:**
- Table: Student Name | Class | Linked Parent | Siblings Count
- Actions: "Link Sibling" (search + connect) | "Unlink" (with confirmation dialog)
- Edge case: "Unlink" triggers creation of fresh parent account for that student

**1-Click Certificate Generator UI:**
- Standard dropdowns for Certificate Type (TC, Bonafide, Character).
- Real-time PDF preview pane.
- Hard block/red alert if library/fee dues exist before printing TC.

---

### 3.9 LIBRARIAN Dashboard
**Layout:** Full-width focused workspace

**Navigation Items:**
- 📚 Book Catalog (Inventory)
- 🔄 Issue / Return (Fast action queue)
- ⚠️ Overdue Fines
- 📊 Library Reports

**5-Second Issue/Return UI:**
- Giant centered input field focused by default (ready for barcode scanner).
- Scanned items appear in a "Queue" stack.
- Auto-calculates late fine on return if overdue > 0 days.

---

### 3.10 STORE_MANAGER Dashboard
**Layout:** Tablet-optimized POS Grid

**Navigation Items:**
- 📦 Inventory Stock
- 🛒 Point of Sale (POS Billing)
- 📝 Purchase Orders

**POS Billing UI:**
- Left panel: Search items / variants (e.g., Blazer Size 34).
- Right panel: Billing receipt layout (Subtotal, Tax, Total).
- Payment Action buttons: [Cash] [Generate Dynamic QR] [Card].
- Auto-triggers 80mm thermal print job on success.

---

### 3.11 SUPER_ADMIN / MASTER_ADMIN Dashboard (Compliance & Reports)
**Layout:** Analytics & Data Export Hub

**Navigation Items:**
- 📈 School Performance Analytics
- 📑 Government & CBSE Compliance (U-DISE+)
- 💰 Revenue & Expense Summary

**Compliance Export UI:**
- **Action Header:** Prominent "[📥 Download U-DISE+ / CBSE Report]" button.
- **Preview Cards (Top Row):**
  - Demographics Card (Category & Gender breakdown).
  - Staff Compliance Card (Total Staff, B.Ed count, PTR Ratio).
  - Infrastructure Card (Active Transport, Safety Expirations).
- **Log Table (Bottom):** History of past exported compliance reports with 1-click re-download options.

---

## 4. Animation & Interaction Specifications

### 4.1 Framer Motion Spring Physics
```tsx
// Modal entrance
initial={{ opacity: 0, scale: 0.95, y: 10 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
transition={{ type: "spring", stiffness: 300, damping: 25 }}

// Button tap feedback
whileTap={{ scale: 0.97 }}

// List item layout animation
<motion.div layout />  // Cards glide into place when filtering
```

### 4.2 Loading States
- Never show blank screens
- Use `<Skeleton />` components matching exact layout shape
- Tables show skeleton rows
- Cards show skeleton blocks

### 4.3 Success Feedback
- Fee paid → Confetti animation (`canvas-confetti`)
- Attendance submitted → Green checkmark toast (`sonner`)
- Marks uploaded → "Great job!" toast with sound cue

### 4.4 Empty States
- No homework: Illustration + "All caught up! Time to relax."
- No notices: Illustration + "It's quiet here. No new announcements."
- No child linked (Parent): Setup wizard illustration + "Link your child's account to get started."

---

## 5. Accessibility (a11y) & WCAG Compliance

### 5.1 ARIA Labels
- All icon-only buttons: `aria-label="Delete Notice"`, `aria-label="Mark Absent"`
- All form inputs: `aria-describedby` linking to error messages

### 5.2 Keyboard Navigation
- Full `Tab` navigation for Super Admin dashboard
- Focus rings: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

### 5.3 Color Contrast
- Minimum 4.5:1 ratio for all text
- Dynamic theme engine validates contrast before applying tenant colors

### 5.4 Touch Targets
- Minimum touch target: `min-h-[44px] min-w-[44px]` (WCAG 2.1 AAA)
- Driver panel: `min-h-[64px]` for bumpy vehicle operation

---

## 6. Form Validation Strategy

- **Library:** `react-hook-form` + `zod` schema validation
- **Pattern:** Real-time inline validation (errors appear as user types, not after submit)
- **Example:**
```typescript
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Minimum 8 characters required"),
});
```

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Target |
|---|---|---|
| `sm` | 640px | Mobile phones (Teacher, Parent, Driver, Student) |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops (Super Admin, Accountant) |
| `xl` | 1280px | Desktop monitors (Master Admin) |

- **Mobile-First roles:** Teacher, Parent, Driver, Student → Design for `sm` first, scale up
- **Desktop-First roles:** Master Admin, Super Admin, Accountant → Design for `lg` first, scale down

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
