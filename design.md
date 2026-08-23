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
- **Mobile:** React Native Expo app (native iOS + Android)
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

## 3. Role-Specific Dashboard Layouts — All 7 Panels

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

### 3.6 DRIVER Dashboard (Ultra-Minimal)
**Layout:** Dark mode default. Maximum 3 buttons visible at any time.

**Navigation Items:**
- 👤 Profile (Name, License, Emergency Contact)
- 🗺️ Route (Assigned route + Stops)
- 🚐 Vehicle (Bus number, Capacity, Fitness Certificate)

**Dashboard:**
- Massive map view (90% of screen)
- Route line drawn on map
- Large floating buttons: **"Start Trip"** / **"End Trip"** / **"Emergency"**
- Stop list with expected arrival times
- Student list on route (names + pickup points)
- Minimum text, maximum touch targets (`min-h-16`)

---

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
