/**
 * ERP Portal — Complete System Architecture Data
 * Total Nodes: 280+
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
          name: "Authentication & Identity",
          desc: "Secure login, roles, and sessions",
          icon: "🔐",
          color: "general",
          children: [
            { name: "Role-Based Access (RBAC)", desc: "Strict permissions for 7 user roles", icon: "🛡️", color: "general" },
            { name: "JWT Session Management", desc: "Stateless, secure API authentication", icon: "🔑", color: "general" },
            { name: "Multi-Factor Auth (MFA)", desc: "Optional OTP for Master & Super Admins", icon: "📱", color: "general" },
            { name: "OAuth Integration", desc: "Google/Microsoft login for teachers & students", icon: "🌐", color: "general" },
            { name: "Session Hijacking", desc: "Prevent stolen tokens from being reused", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Data Privacy & Security",
          desc: "Protecting sensitive student/school data",
          icon: "🛡️",
          color: "general",
          children: [
            { name: "Tenant Data Isolation", desc: "Row-Level Security (RLS) in PostgreSQL", icon: "🧱", color: "general" },
            { name: "End-to-End Encryption", desc: "Encrypting sensitive fields at rest", icon: "🔒", color: "general" },
            { name: "PII Masking", desc: "Masking phone/email for unauthorized roles", icon: "🕵️", color: "general" },
            { name: "Data Breach Prevention", desc: "Rate limiting and abnormal activity detection", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "SaaS App Builder Engine",
          desc: "White-labeling and dynamic UI",
          icon: "🏗️",
          color: "general",
          children: [
            { name: "Dynamic Theming", desc: "Custom colors & logos per school tenant", icon: "🎨", color: "general" },
            { name: "Custom Domain Mapping", desc: "e.g., erp.schoolname.com via CNAME", icon: "🌐", color: "general" },
            { name: "Feature Toggles", desc: "Enable/disable modules based on subscription", icon: "🎛️", color: "general" },
            { name: "White-label Mobile App", desc: "Generate distinct APK/iOS apps per school", icon: "📱", color: "general" },
            { name: "Theme Conflict", desc: "Ensure accessibility with bad custom colors", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Database Architecture",
          desc: "Scalable data storage",
          icon: "🗄️",
          color: "general",
          children: [
            { name: "PostgreSQL Core DB", desc: "Relational data with Prisma ORM", icon: "🐘", color: "general" },
            { name: "Redis Caching", desc: "Fast retrieval for config & sessions", icon: "⚡", color: "general" },
            { name: "Automated Backups", desc: "Daily snapshots & point-in-time recovery", icon: "💾", color: "general" },
            { name: "Tenant Scaling Limit", desc: "Handling DB performance at 10,000+ tenants", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "API & Integrations",
          desc: "External connections and webhooks",
          icon: "🔌",
          color: "general",
          children: [
            { name: "Offline Sync Engine", desc: "Local-first architecture with background sync queue", icon: "📴", color: "general" },
            { name: "Payment Gateway (Razorpay)", desc: "Fee collection via SmartCollect", icon: "💳", color: "general" },
            { name: "SMS Gateway (DLT)", MSG91: "Transactional SMS delivery", icon: "💬", color: "general" },
            { name: "WhatsApp Business API", desc: "Automated WhatsApp alerts", icon: "🟢", color: "general" },
            { name: "AI Engine (Gemini)", desc: "Narrative report and alert generation", icon: "🤖", color: "general" },
            { name: "Third-party API Failure", desc: "Graceful fallback if external API is down", icon: "⚠️", color: "edge", edge: true }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👑 MASTER ADMIN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "MASTER ADMIN",
      desc: "Platform Owner • Developer-level access",
      icon: "👑",
      color: "master",
      children: [
        {
          name: "School Management",
          desc: "Create & manage multiple school tenants",
          icon: "🏫",
          color: "master",
          children: [
            { name: "Create New School", desc: "Name, logo, address, academic year config", icon: "➕", color: "master" },
            { name: "Edit School Details", desc: "Update school info, branding, contact", icon: "✏️", color: "master" },
            { name: "Activate / Deactivate", desc: "Enable or suspend school access", icon: "🔄", color: "master" },
            { name: "School-Specific Settings", desc: "Custom config per school (grading scale, shifts)", icon: "⚙️", color: "master" },
            { name: "Duplicate School Name", desc: "Prevent two schools with identical names in same city", icon: "⚠️", color: "edge", edge: true },
            { name: "Data Isolation", desc: "Ensure School A cannot access School B data", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Super Admin Assignment",
          desc: "Assign Principal/Head to each school",
          icon: "🔑",
          color: "master",
          children: [
            { name: "Assign Principal Account", desc: "Create Super Admin credentials for school", icon: "👤", color: "master" },
            { name: "Transfer Authority", desc: "Change Principal mid-year (old → new)", icon: "🔁", color: "master" },
            { name: "Only One Active Super Admin", desc: "Prevent multiple principals with full access simultaneously", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Subscription Management",
          desc: "Plans, billing & usage for SaaS model",
          icon: "💎",
          color: "master",
          children: [
            { name: "Plan Creation", desc: "Free / Basic / Premium tiers with feature limits", icon: "📋", color: "master" },
            { name: "Billing & Invoicing", desc: "Auto-generate monthly/yearly invoices", icon: "🧾", color: "master" },
            { name: "Usage Analytics", desc: "Track active users, storage, API calls per school", icon: "📊", color: "master" },
            { name: "Graceful Downgrade", desc: "No data loss when school downgrades plan", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Global Analytics",
          desc: "Platform-wide insights & health",
          icon: "📊",
          color: "master",
          children: [
            { name: "Total Schools", desc: "Count of active/inactive/trial schools", icon: "🏫", color: "master" },
            { name: "Active Users", desc: "Total users across all schools", icon: "👥", color: "master" },
            { name: "Revenue Dashboard", desc: "MRR, ARR, churn rate", icon: "💰", color: "master" },
            { name: "System Health", desc: "Server uptime, DB load, error rates", icon: "🖥️", color: "master" }
          ]
        },
        {
          name: "System Settings",
          desc: "Global platform configuration",
          icon: "⚙️",
          color: "master",
          children: [
            { name: "Default Permissions Template", desc: "Baseline RBAC for new schools", icon: "🔒", color: "master" },
            { name: "Feature Flags", desc: "Enable/disable modules globally or per school", icon: "🚩", color: "master" },
            { name: "Maintenance Mode", desc: "Take platform offline for updates", icon: "🔧", color: "master" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎓 SUPER ADMIN (Principal)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "SUPER ADMIN (Principal)",
      desc: "Full school access • role=SUPER_ADMIN",
      icon: "🎓",
      color: "super_admin",
      children: [
        {
          name: "School Dashboard",
          desc: "At-a-glance overview of school health",
          icon: "📊",
          color: "super_admin",
          children: [
            { name: "Today's Attendance Summary", desc: "% present, absent count, late arrivals", icon: "📋", color: "super_admin" },
            { name: "Fee Collection Status", desc: "Collected vs pending for current month", icon: "💰", color: "super_admin" },
            { name: "Upcoming Events", desc: "Next exam, PTM, holidays from academic calendar", icon: "📅", color: "super_admin" },
            { name: "AI At-Risk Alerts", desc: "Students flagged by Early Warning System", icon: "🚨", color: "super_admin" },
            { name: "Syllabus Progress Overview", desc: "Class-wise % completion across subjects", icon: "📚", color: "super_admin" }
          ]
        },
        {
          name: "Academic Management",
          desc: "Classes, subjects, timetable, syllabus",
          icon: "📚",
          color: "super_admin",
          children: [
            {
              name: "Class Management",
              desc: "Create and organize classes & sections",
              icon: "🏛️",
              color: "super_admin",
              children: [
                { name: "Create Class", desc: "e.g., Class 10-A, Nursery, LKG", icon: "➕", color: "super_admin" },
                { name: "Edit / Delete Class", desc: "Modify class details or remove", icon: "✏️", color: "super_admin" },
                { name: "Section Management", desc: "Sections A, B, C within a class", icon: "📂", color: "super_admin" },
                { name: "Cannot Delete With Active Students", desc: "Block deletion if students are enrolled", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Subject Management",
              desc: "Define subjects and assign to classes",
              icon: "📖",
              color: "super_admin",
              children: [
                { name: "Add Subject", desc: "Subject name, code (e.g., MATH-101)", icon: "➕", color: "super_admin" },
                { name: "Assign to Class", desc: "Link subject to specific class/section", icon: "🔗", color: "super_admin" },
                { name: "Removing Subject With Marks", desc: "Prevent deletion if exam marks exist for it", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Class-Teacher Mapping",
              desc: "Assign teachers to classes & subjects",
              icon: "🔗",
              color: "super_admin",
              children: [
                { name: "Assign Subject Teacher", desc: "Which teacher teaches which subject in which class", icon: "👨‍🏫", color: "super_admin" },
                { name: "Assign Class Teacher (Head)", desc: "One primary class teacher per section", icon: "⭐", color: "super_admin" },
                { name: "View Mapping Matrix", desc: "Grid view: Teachers × Classes × Subjects", icon: "📊", color: "super_admin" },
                { name: "Same Teacher, Same Period", desc: "AI check: teacher cannot be in two classes at once", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "AI Timetable Generator",
              desc: "Auto-generate conflict-free schedules",
              icon: "🤖",
              color: "super_admin",
              children: [
                { name: "Input Constraints", desc: "Teacher availability, room limits, subject hours", icon: "📝", color: "super_admin" },
                { name: "Generate Schedule", desc: "AI creates optimal, conflict-free timetable", icon: "⚡", color: "super_admin" },
                { name: "Manual Override", desc: "Principal can swap periods manually after generation", icon: "✋", color: "super_admin" },
                { name: "Insufficient Teachers", desc: "Alert if not enough teachers to fill all slots", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Syllabus Management",
              desc: "Define & track syllabus per class per subject",
              icon: "📝",
              color: "super_admin",
              children: [
                { name: "Upload Syllabus", desc: "Topics list per subject per class for the year", icon: "📤", color: "super_admin" },
                { name: "Set Expected Hours", desc: "Expected teaching hours per topic", icon: "⏱️", color: "super_admin" },
                { name: "Track Completion", desc: "Live progress bar of completed vs pending topics", icon: "📊", color: "super_admin" },
                { name: "AI Merge Suggestions", desc: "If behind schedule, AI suggests combining topics", icon: "🤖", color: "super_admin" }
              ]
            },
            {
              name: "Academic Calendar",
              desc: "School events, exams, holidays",
              icon: "📅",
              color: "super_admin",
              children: [
                { name: "Add Events", desc: "Exams, holidays, PTM, sports day, etc.", icon: "➕", color: "super_admin" },
                { name: "Date-wise View", desc: "Calendar grid with event markers", icon: "📆", color: "super_admin" },
                { name: "Exam on Holiday", desc: "Warn if exam is scheduled on a declared holiday", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Teacher Management",
          desc: "Add, edit, assign roles to teachers",
          icon: "👨‍🏫",
          color: "super_admin",
          children: [
            {
              name: "Add / Edit Teacher",
              desc: "Teacher profile & credentials",
              icon: "👤",
              color: "super_admin",
              children: [
                { name: "Personal Details", desc: "Name, DOB, contact, address", icon: "📝", color: "super_admin" },
                { name: "Qualification & Experience", desc: "Degrees, certifications, years of experience", icon: "🎓", color: "super_admin" },
                { name: "Login Credentials", desc: "Auto-generate or manual email/password", icon: "🔑", color: "super_admin" },
                { name: "Duplicate Email / Phone", desc: "Block if email or phone already registered", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Roles & Permissions",
              desc: "Module-level access for each teacher",
              icon: "🔒",
              color: "super_admin",
              children: [
                { name: "Module Access Control", desc: "Enable/disable specific features per teacher", icon: "✅", color: "super_admin" },
                { name: "Revoking Mid-Session", desc: "Handle when permission removed while teacher is logged in", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Leave Approvals",
              desc: "Review teacher leave applications",
              icon: "📋",
              color: "super_admin",
              children: [
                { name: "Pending Approvals", desc: "List of unapproved leave requests", icon: "⏳", color: "super_admin" },
                { name: "AI Substitute Suggestion", desc: "AI recommends which free teacher can cover", icon: "🤖", color: "super_admin" },
                { name: "Leave During Exam", desc: "Flag & warn if teacher is on exam duty during leave dates", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Student Management",
          desc: "Enrollment, profiles, parent linking",
          icon: "👨‍🎓",
          color: "super_admin",
          children: [
            {
              name: "Enrollment",
              desc: "Add students to the school",
              icon: "📝",
              color: "super_admin",
              children: [
                { name: "Add Student", desc: "Name, DOB, class, section, roll number", icon: "➕", color: "super_admin" },
                { name: "Bulk Import", desc: "Upload CSV/Excel for mass enrollment", icon: "📤", color: "super_admin" },
                { name: "Auto Roll Number", desc: "System assigns sequential roll numbers", icon: "🔢", color: "super_admin" },
                { name: "Duplicate Roll Number", desc: "Prevent same roll no in same class-section", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Profile Management",
              desc: "Student personal & medical info",
              icon: "👤",
              color: "super_admin",
              children: [
                { name: "Personal Details", desc: "Name, DOB, address, blood group", icon: "📝", color: "super_admin" },
                { name: "Medical Information", desc: "Allergies, medications, special needs", icon: "🏥", color: "super_admin" },
                { name: "Previous School Records", desc: "TC from previous school, previous marks", icon: "📁", color: "super_admin" },
                { name: "Profile Photo", desc: "Upload student photo for ID & records", icon: "📷", color: "super_admin" }
              ]
            },
            {
              name: "Parent Account Linking",
              desc: "Connect parent to student profile",
              icon: "👨‍👩‍👦",
              color: "super_admin",
              children: [
                { name: "Link by Phone / Email", desc: "Parent receives invite to create account", icon: "🔗", color: "super_admin" },
                { name: "Multiple Children", desc: "One parent account linked to multiple students", icon: "👥", color: "super_admin" },
                { name: "Wrong Student Linked", desc: "Admin must verify & fix incorrect parent-student mapping", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Promotion / Transfer",
              desc: "Year-end class promotion & TC",
              icon: "📤",
              color: "super_admin",
              children: [
                { name: "Promote to Next Class", desc: "Bulk or individual promotion at year-end", icon: "⬆️", color: "super_admin" },
                { name: "Transfer Certificate (TC)", desc: "Generate official TC document", icon: "📄", color: "super_admin" },
                { name: "Promoting Failed Student", desc: "Confirm intent if student hasn't passed exams", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Communication",
          desc: "Notices, announcements, SMS",
          icon: "📢",
          color: "super_admin",
          children: [
            {
              name: "Notice Board",
              desc: "Create & publish notices",
              icon: "📌",
              color: "super_admin",
              children: [
                { name: "AI Smart Notices", desc: "Auto-draft notices in multiple languages via Gemini", icon: "🤖", color: "super_admin" },
                { name: "Create Notice", desc: "Title, body, attachments", icon: "✏️", color: "super_admin" },
                { name: "Target by Role", desc: "Send to Teachers only, Parents only, or all", icon: "🎯", color: "super_admin" },
                { name: "Target by Class", desc: "Send to specific class/section", icon: "🏛️", color: "super_admin" },
                { name: "Schedule Notice", desc: "Publish at a future date/time", icon: "⏰", color: "super_admin" },
                { name: "Sending to Inactive Users", desc: "Skip deactivated accounts, log delivery failures", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Bulk SMS (DLT)",
              desc: "Professional transactional SMS",
              icon: "📱",
              color: "super_admin",
              children: [
                { name: "Template Management", desc: "DLT-approved SMS templates", icon: "📋", color: "super_admin" },
                { name: "Recipient Selection", desc: "Class-wise or role-wise selection", icon: "👥", color: "super_admin" },
                { name: "Delivery Reports", desc: "Track sent/delivered/failed status", icon: "📊", color: "super_admin" },
                { name: "DLT Template Not Approved", desc: "Fallback message if template rejected by TRAI", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Transport Management",
          desc: "Vehicles, routes, drivers",
          icon: "🚌",
          color: "super_admin",
          children: [
            {
              name: "Vehicle Management",
              desc: "Register & track school vehicles",
              icon: "🚐",
              color: "super_admin",
              children: [
                { name: "Add Vehicle", desc: "Bus number, capacity, registration", icon: "➕", color: "super_admin" },
                { name: "Fitness Certificate", desc: "Track validity & renewal dates", icon: "📜", color: "super_admin" },
                { name: "Overcapacity Assignment", desc: "Block if students assigned exceed bus capacity", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Route Management",
              desc: "Define routes, stops, timings",
              icon: "🗺️",
              color: "super_admin",
              children: [
                { name: "Define Route", desc: "Route name, stops with lat/lng, timings", icon: "📍", color: "super_admin" },
                { name: "Assign Vehicle to Route", desc: "Link bus to a specific route", icon: "🔗", color: "super_admin" },
                { name: "Route Without Driver", desc: "Alert if route has vehicle but no driver assigned", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Driver Assignment",
              desc: "Assign drivers & conductors",
              icon: "🧑‍✈️",
              color: "super_admin",
              children: [
                { name: "Assign Driver", desc: "Link driver to vehicle & route", icon: "🔗", color: "super_admin" },
                { name: "License Verification", desc: "Verify driving license validity", icon: "🪪", color: "super_admin" },
                { name: "Driver on Multiple Vehicles", desc: "Prevent one driver assigned to two buses simultaneously", icon: "⚠️", color: "edge", edge: true }
              ]
            }
          ]
        },
        {
          name: "Fee Management",
          desc: "Fee structure, payments, reconciliation",
          icon: "💰",
          color: "super_admin",
          children: [
            {
              name: "Fee Structure Setup",
              desc: "Define fees per class per year",
              icon: "📋",
              color: "super_admin",
              children: [
                { name: "Define Fee Types", desc: "Tuition, Transport, Library, Sports, Lab", icon: "📂", color: "super_admin" },
                { name: "Set Amount per Class", desc: "Different fee for different classes", icon: "💵", color: "super_admin" },
                { name: "Due Date & Late Fee", desc: "Monthly/quarterly dues with penalty config", icon: "📅", color: "super_admin" },
                { name: "Changing Fee Mid-Year", desc: "Handle students who paid old rate vs new rate", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Auto Fee Reconciliation",
              desc: "Razorpay SmartCollect integration",
              icon: "🤖",
              color: "super_admin",
              children: [
                { name: "SmartCollect Integration", desc: "Virtual bank accounts via Razorpay API", icon: "🏦", color: "super_admin" },
                { name: "Virtual Account per Student", desc: "Unique UPI/Account number for each student", icon: "🔢", color: "super_admin" },
                { name: "Auto Mark as Paid", desc: "Webhook triggers fee status update on payment", icon: "✅", color: "super_admin" },
                { name: "Partial Payment", desc: "Handle when parent pays less than full amount", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Concession / Scholarship",
              desc: "Fee discounts for eligible students",
              icon: "🎁",
              color: "super_admin",
              children: [
                { name: "Apply Discount", desc: "Percentage or fixed amount discount", icon: "💸", color: "super_admin" },
                { name: "Category-based", desc: "Staff child, sibling, merit, EWS", icon: "📂", color: "super_admin" },
                { name: "Concession Exceeds Fee", desc: "Prevent discount amount greater than actual fee", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Financial Reports",
              desc: "Collection, dues, expense summaries",
              icon: "📊",
              color: "super_admin",
              children: [
                { name: "Collection Summary", desc: "Daily/monthly/yearly collection reports", icon: "📈", color: "super_admin" },
                { name: "Defaulters List", desc: "Students with overdue fees", icon: "📋", color: "super_admin" },
                { name: "Expense Tracking", desc: "School's operational expenses", icon: "💸", color: "super_admin" },
                { name: "Export to Excel / PDF", desc: "Download reports in standard formats", icon: "📥", color: "super_admin" }
              ]
            }
          ]
        },
        {
          name: "Reports & Analytics",
          desc: "School-wide insights & AI alerts",
          icon: "📊",
          color: "super_admin",
          children: [
            {
              name: "Attendance Reports",
              desc: "Comprehensive attendance analytics",
              icon: "📋",
              color: "super_admin",
              children: [
                { name: "Class-wise Summary", desc: "Attendance % per class per month", icon: "🏛️", color: "super_admin" },
                { name: "Student-wise Detail", desc: "Individual student attendance records", icon: "👤", color: "super_admin" },
                { name: "Monthly / Yearly Trends", desc: "Visual charts showing attendance patterns", icon: "📈", color: "super_admin" },
                { name: "Export Options", desc: "Download as Excel, PDF, or CSV", icon: "📥", color: "super_admin" }
              ]
            },
            {
              name: "Exam & Result Reports",
              desc: "Performance analytics across exams",
              icon: "📝",
              color: "super_admin",
              children: [
                { name: "Class Toppers", desc: "Rank list per class per exam", icon: "🏆", color: "super_admin" },
                { name: "Subject-wise Analysis", desc: "Average, highest, lowest marks per subject", icon: "📊", color: "super_admin" },
                { name: "Grade Distribution", desc: "How many A, B, C, D, Fail per exam", icon: "📈", color: "super_admin" }
              ]
            },
            {
              name: "AI At-Risk Early Warning",
              desc: "Proactive student risk detection",
              icon: "🚨",
              color: "super_admin",
              children: [
                { name: "Attendance Drop Detection", desc: "Flag sudden drop in attendance pattern", icon: "📉", color: "super_admin" },
                { name: "Performance Decline", desc: "Alert when marks drop significantly across exams", icon: "⬇️", color: "super_admin" },
                { name: "Homework Non-Submission", desc: "Track students consistently not submitting", icon: "📝", color: "super_admin" },
                { name: "False Positive Alerts", desc: "Allow dismissing alerts with reason (e.g., medical leave)", icon: "⚠️", color: "edge", edge: true }
              ]
            },
            {
              name: "Behavioral & Skill Report (AI)",
              desc: "Year-long personality assessment",
              icon: "🧠",
              color: "super_admin",
              children: [
                { name: "Tag Aggregation", desc: "Collect all teacher-assigned tags for a student", icon: "🏷️", color: "super_admin" },
                { name: "AI Narrative Generation", desc: "Gemini API generates personality report from tags", icon: "🤖", color: "super_admin" },
                { name: "Report Card Integration", desc: "Attach AI report alongside marks in final report", icon: "📄", color: "super_admin" }
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
      desc: "Class management • Attendance • Results",
      icon: "👨‍🏫",
      color: "teacher",
      children: [
        {
          name: "Teacher Dashboard",
          desc: "Today's tasks & schedule overview",
          icon: "📊",
          color: "teacher",
          children: [
            { name: "Today's Schedule", desc: "List of classes to teach today with room numbers", icon: "📅", color: "teacher" },
            { name: "Pending Tasks", desc: "Unmarked attendance, unchecked homework", icon: "⏳", color: "teacher" },
            { name: "Notifications", desc: "Leave approval updates, notices from admin", icon: "🔔", color: "teacher" }
          ]
        },
        {
          name: "Attendance Marking",
          desc: "Daily student attendance management",
          icon: "✅",
          color: "teacher",
          children: [
            { name: "Mark Present / Absent / Late", desc: "Select class → mark each student's status", icon: "📋", color: "teacher" },
            { name: "Bulk Mark (All Present)", desc: "One-click mark all present, then edit exceptions", icon: "⚡", color: "teacher" },
            { name: "Edit Past Attendance", desc: "Modify previous day's attendance (requires approval)", icon: "✏️", color: "teacher" },
            { name: "Offline Mode", desc: "Mark attendance without internet, auto-sync later", icon: "📴", color: "teacher" },
            { name: "Wrong Date Attendance", desc: "Prevent marking attendance for future dates", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Homework Management",
          desc: "Create & track homework assignments",
          icon: "📝",
          color: "teacher",
          children: [
            { name: "Create Homework", desc: "Title, description, due date, class/section", icon: "➕", color: "teacher" },
            { name: "Attach Files", desc: "Upload PDF, images, or links as reference", icon: "📎", color: "teacher" },
            { name: "View Submissions", desc: "Check which students submitted and when", icon: "📥", color: "teacher" },
            { name: "Due Date in Past", desc: "Warn if teacher sets due date that already passed", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Exam & Result Management",
          desc: "Create exams, upload marks, publish results",
          icon: "📊",
          color: "teacher",
          children: [
            { name: "Create Exam", desc: "Exam name, subject, date, total marks, passing marks", icon: "➕", color: "teacher" },
            { name: "Upload Marks", desc: "Manual entry or bulk Excel import", icon: "📤", color: "teacher" },
            { name: "Auto Grade Calculation", desc: "System calculates grade from marks & grading scale", icon: "🤖", color: "teacher" },
            { name: "Publish Results", desc: "Make results visible to students & parents", icon: "📢", color: "teacher" },
            { name: "Marks Exceeding Total", desc: "Block if entered marks > total marks of exam", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Syllabus Progress",
          desc: "Update topic completion status",
          icon: "📚",
          color: "teacher",
          children: [
            { name: "Mark Topic Completed", desc: "Check off taught topics from syllabus list", icon: "✅", color: "teacher" },
            { name: "View Progress Bar", desc: "Visual indicator of syllabus completion %", icon: "📊", color: "teacher" },
            { name: "AI Catch-up Suggestions", desc: "If behind schedule, AI suggests topic merging strategies", icon: "🤖", color: "teacher" }
          ]
        },
        {
          name: "Student Behavioral Tags",
          desc: "Tag students with personality traits",
          icon: "🏷️",
          color: "teacher",
          children: [
            { name: "Add Tag", desc: "Leadership, Creative, Helpful, Distracted, etc.", icon: "➕", color: "teacher" },
            { name: "View Tag History", desc: "See all tags given to a student over time", icon: "📋", color: "teacher" },
            { name: "Inappropriate Tag", desc: "Moderate/block offensive or biased tags", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Leave Application",
          desc: "Apply for personal leave",
          icon: "🏖️",
          color: "teacher",
          children: [
            { name: "Apply for Leave", desc: "Select type (Sick/Casual/Personal), dates, reason", icon: "📝", color: "teacher" },
            { name: "Track Status", desc: "Pending / Approved / Rejected status", icon: "📋", color: "teacher" },
            { name: "AI Substitute View", desc: "See who AI suggests as replacement", icon: "🤖", color: "teacher" },
            { name: "Leave During Exam Duty", desc: "Warn if teacher has exam supervision during leave dates", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Class Schedule View",
          desc: "Teacher's personal timetable",
          icon: "📅",
          color: "teacher",
          children: [
            { name: "Weekly Timetable", desc: "Day-wise period-wise schedule", icon: "📆", color: "teacher" },
            { name: "Room Assignment", desc: "Which room/lab for each period", icon: "🏫", color: "teacher" },
            { name: "Substitution Alerts", desc: "Notifications when assigned as substitute", icon: "🔔", color: "teacher" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👨‍🎓 STUDENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "STUDENT",
      desc: "View attendance, results, homework, leave",
      icon: "👨‍🎓",
      color: "student",
      children: [
        {
          name: "Student Dashboard",
          desc: "Personal overview & quick access",
          icon: "📊",
          color: "student",
          children: [
            { name: "Profile Overview", desc: "Photo, name, class, roll number, section", icon: "👤", color: "student" },
            { name: "Today's Schedule", desc: "Today's classes with subject & teacher info", icon: "📅", color: "student" },
            { name: "Upcoming Tests", desc: "Next scheduled exams with subjects & dates", icon: "📝", color: "student" },
            { name: "Pending Homework", desc: "Homework due today or overdue", icon: "⏳", color: "student" }
          ]
        },
        {
          name: "Attendance View",
          desc: "Personal attendance records",
          icon: "📋",
          color: "student",
          children: [
            { name: "Calendar View", desc: "Color-coded calendar (green=present, red=absent)", icon: "📆", color: "student" },
            { name: "Monthly Summary", desc: "Attendance % per month", icon: "📊", color: "student" },
            { name: "Below Minimum %", desc: "Alert if attendance drops below school requirement (e.g., 75%)", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Results & Report Cards",
          desc: "Exam marks and grade cards",
          icon: "📊",
          color: "student",
          children: [
            { name: "Exam-wise Marks", desc: "Marks for each exam with subject breakdown", icon: "📝", color: "student" },
            { name: "Grade Card View", desc: "Official grade card format", icon: "📄", color: "student" },
            { name: "Progress Trend Chart", desc: "Visual chart showing marks trend over exams", icon: "📈", color: "student" },
            { name: "Download Report Card", desc: "PDF download of official report card", icon: "📥", color: "student" }
          ]
        },
        {
          name: "Homework",
          desc: "View & submit assignments",
          icon: "📝",
          color: "student",
          children: [
            { name: "View Assigned", desc: "List of all homework with due dates", icon: "📋", color: "student" },
            { name: "Submit Online", desc: "Upload file (PDF/image) as submission", icon: "📤", color: "student" },
            { name: "Submit Online", desc: "Upload file (PDF/image) as submission", icon: "📤", color: "student" },
            { name: "Submission Status", desc: "Submitted / Pending / Late indicator", icon: "✅", color: "student" },
            { name: "Late Submission", desc: "Mark as late if submitted after due date", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Syllabus Progress View",
          desc: "Track what's been taught",
          icon: "📚",
          color: "student",
          children: [
            { name: "Subject-wise Topics", desc: "All topics listed per subject", icon: "📖", color: "student" },
            { name: "Completed vs Pending", desc: "Visual split of done & remaining", icon: "📊", color: "student" },
            { name: "Progress Percentage", desc: "Overall & per-subject completion %", icon: "📈", color: "student" }
          ]
        },
        {
          name: "Timetable View",
          desc: "Class schedule",
          icon: "📅",
          color: "student",
          children: [
            { name: "Today's Classes", desc: "Current day's full schedule", icon: "📋", color: "student" },
            { name: "Full Week Schedule", desc: "Monday to Saturday period grid", icon: "📆", color: "student" },
            { name: "Teacher Info per Period", desc: "Which teacher for which subject", icon: "👨‍🏫", color: "student" }
          ]
        },
        {
          name: "Leave Application",
          desc: "Apply for leave online",
          icon: "🏖️",
          color: "student",
          children: [
            { name: "Apply for Leave", desc: "Select dates, type, reason", icon: "📝", color: "student" },
            { name: "Parent Consent Required", desc: "Leave needs parent's approval first, then school", icon: "👨‍👩‍👦", color: "student" },
            { name: "Track Application", desc: "View status: Pending → Parent Approved → School Approved", icon: "📋", color: "student" },
            { name: "Leave During Exam", desc: "Warn student that exam is scheduled during leave dates", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Notice Board",
          desc: "School announcements",
          icon: "📌",
          color: "student",
          children: [
            { name: "All Notices", desc: "Chronological list of all notices", icon: "📋", color: "student" },
            { name: "Filtered by Relevance", desc: "Show only notices targeting student's class", icon: "🎯", color: "student" },
            { name: "Read / Unread", desc: "Visual indicator for new notices", icon: "🔵", color: "student" }
          ]
        },
        {
          name: "Transport Details",
          desc: "Bus route & driver info",
          icon: "🚌",
          color: "student",
          children: [
            { name: "Assigned Route", desc: "Route name, stop list, timings", icon: "🗺️", color: "student" },
            { name: "Bus Number & Timing", desc: "Bus registration & pickup/drop time", icon: "🚐", color: "student" },
            { name: "Driver Contact", desc: "Driver name & phone number", icon: "📞", color: "student" }
          ]
        },
        {
          name: "Document Vault",
          desc: "Secure digital document storage",
          icon: "🔒",
          color: "student",
          children: [
            { name: "Report Cards", desc: "All years' report cards stored digitally", icon: "📄", color: "student" },
            { name: "Certificates", desc: "Achievement certificates, participation certs", icon: "🏆", color: "student" },
            { name: "Medical Records", desc: "Vaccination records, health checkup reports", icon: "🏥", color: "student" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👨‍👩‍👦 PARENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "PARENT",
      desc: "Child monitoring • Fee payment • Communication",
      icon: "👨‍👩‍👦",
      color: "parent",
      children: [
        {
          name: "Parent Dashboard",
          desc: "Child-centric overview",
          icon: "📊",
          color: "parent",
          children: [
            { name: "Child Selector", desc: "Switch between children if parent has multiple kids", icon: "👥", color: "parent" },
            { name: "Quick Summary", desc: "Attendance %, pending fees, last exam marks", icon: "📋", color: "parent" },
            { name: "Notifications", desc: "Fee reminders, notice alerts, leave updates", icon: "🔔", color: "parent" },
            { name: "No Child Linked", desc: "Show setup wizard if parent account has no child linked", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Attendance View",
          desc: "Child's attendance tracking",
          icon: "📋",
          color: "parent",
          children: [
            { name: "Attendance Calendar", desc: "Color-coded monthly calendar of child's attendance", icon: "📆", color: "parent" },
            { name: "Absent Days List", desc: "List of all absent dates with leave status", icon: "📋", color: "parent" },
            { name: "Attendance Percentage", desc: "Overall & monthly attendance %", icon: "📊", color: "parent" }
          ]
        },
        {
          name: "Marks & Results",
          desc: "Child's academic performance",
          icon: "📊",
          color: "parent",
          children: [
            { name: "Exam Results", desc: "Subject-wise marks for each exam", icon: "📝", color: "parent" },
            { name: "Progress Trends", desc: "Visual chart showing improvement/decline", icon: "📈", color: "parent" },
            { name: "Download Report Card", desc: "PDF download of official report", icon: "📥", color: "parent" }
          ]
        },
        {
          name: "Fee Payment",
          desc: "View dues & pay online/offline",
          icon: "💳",
          color: "parent",
          children: [
            { name: "View Fee Dues", desc: "Breakup: Tuition, Transport, Late Fee, etc.", icon: "📋", color: "parent" },
            { name: "Pay Online (Razorpay)", desc: "UPI, Card, NetBanking payment gateway", icon: "💳", color: "parent" },
            { name: "Offline Payment → Receipt", desc: "Pay at school counter, receipt auto-generated on portal", icon: "🧾", color: "parent" },
            { name: "Payment History", desc: "All past payments with transaction IDs", icon: "📜", color: "parent" },
            { name: "Download Receipt (PDF)", desc: "Official fee receipt download", icon: "📥", color: "parent" },
            { name: "Payment Failure / Retry", desc: "Handle failed online payment, allow retry without double charge", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Syllabus Progress",
          desc: "Track child's course coverage",
          icon: "📚",
          color: "parent",
          children: [
            { name: "Subject-wise Completion", desc: "% of syllabus covered per subject", icon: "📊", color: "parent" },
            { name: "Comparison with Expected", desc: "Is teacher on track vs expected schedule?", icon: "📈", color: "parent" }
          ]
        },
        {
          name: "Behavioral Report (AI)",
          desc: "AI-generated personality assessment",
          icon: "🧠",
          color: "parent",
          children: [
            { name: "Year-long Tag Summary", desc: "All behavioral tags given by teachers", icon: "🏷️", color: "parent" },
            { name: "AI Narrative Report", desc: "Detailed personality assessment by AI", icon: "🤖", color: "parent" },
            { name: "Strengths & Improvements", desc: "Clear list of strong areas & areas needing work", icon: "📋", color: "parent" }
          ]
        },
        {
          name: "Teacher Information",
          desc: "Child's teachers & contact",
          icon: "👨‍🏫",
          color: "parent",
          children: [
            { name: "Class Teacher Details", desc: "Name, subject, contact of class teacher", icon: "⭐", color: "parent" },
            { name: "Subject Teacher List", desc: "All subject teachers with names & subjects", icon: "📋", color: "parent" },
            { name: "Teacher Changed Mid-Year", desc: "Notify parent when subject teacher changes", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Transport Details",
          desc: "Child's bus route & driver",
          icon: "🚌",
          color: "parent",
          children: [
            { name: "Route & Stops", desc: "Route name, stop sequence, timings", icon: "🗺️", color: "parent" },
            { name: "Driver Details", desc: "Driver name, phone, license number", icon: "🧑‍✈️", color: "parent" },
            { name: "Route Changed Without Notice", desc: "Alert parent if route/timing changed without prior notification", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Notice Board",
          desc: "School announcements",
          icon: "📌",
          color: "parent",
          children: [
            { name: "School Notices", desc: "General school announcements", icon: "📋", color: "parent" },
            { name: "Fee Reminders", desc: "Automated fee due date reminders", icon: "💰", color: "parent" },
            { name: "Exam Schedule", desc: "Upcoming exam dates & subjects", icon: "📅", color: "parent" }
          ]
        },
        {
          name: "Leave Approval",
          desc: "Approve child's leave applications",
          icon: "✅",
          color: "parent",
          children: [
            { name: "View Applications", desc: "All leave requests from child", icon: "📋", color: "parent" },
            { name: "Approve / Reject", desc: "Parent gives consent before school processes", icon: "👍", color: "parent" },
            { name: "Approving During Exam", desc: "Strong warning if child is taking leave during scheduled exam", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Document Vault",
          desc: "Access child's secured documents",
          icon: "🔒",
          color: "parent",
          children: [
            { name: "Report Cards", desc: "Download all years' report cards", icon: "📄", color: "parent" },
            { name: "Transfer Certificates", desc: "TC issued by school", icon: "📜", color: "parent" },
            { name: "Medical Records", desc: "Health checkup & vaccination records", icon: "🏥", color: "parent" },
            { name: "Download / Share", desc: "Download as PDF or share via link", icon: "📤", color: "parent" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚌 DRIVER / CONDUCTOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "DRIVER / CONDUCTOR",
      desc: "Profile, route details, vehicle status",
      icon: "🚌",
      color: "driver",
      children: [
        {
          name: "Profile Management",
          desc: "Personal & professional details",
          icon: "👤",
          color: "driver",
          children: [
            { name: "Personal Details", desc: "Name, phone, address, emergency contact", icon: "📝", color: "driver" },
            { name: "License Number & Validity", desc: "DL number with expiry tracking", icon: "🪪", color: "driver" },
            { name: "Emergency Contact", desc: "Family member contact for emergencies", icon: "📞", color: "driver" },
            { name: "License Expired", desc: "Alert & restrict access if driving license has expired", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Route Details",
          desc: "Assigned route information",
          icon: "🗺️",
          color: "driver",
          children: [
            { name: "Assigned Route", desc: "Route name with all stop details", icon: "📍", color: "driver" },
            { name: "Stop Timings", desc: "Expected arrival time at each stop", icon: "⏰", color: "driver" },
            { name: "Student List on Route", desc: "Names & pickup points of students on this route", icon: "👥", color: "driver" },
            { name: "No Route Assigned", desc: "Show 'Contact Admin' if driver has no route", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Vehicle Status",
          desc: "Bus details & compliance",
          icon: "🚐",
          color: "driver",
          children: [
            { name: "Bus Number", desc: "Registration number & model", icon: "🔢", color: "driver" },
            { name: "Capacity & Load", desc: "Total seats vs assigned students", icon: "📊", color: "driver" },
            { name: "Fitness Certificate", desc: "Certificate validity & renewal reminder", icon: "📜", color: "driver" }
          ]
        }
      ]
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💼 ACCOUNTANT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      name: "ACCOUNTANT",
      desc: "Fee collection • Receipts • Expenses • Reports",
      icon: "💼",
      color: "accountant",
      children: [
        {
          name: "Fee Collection Dashboard",
          desc: "Today's collections & pending overview",
          icon: "💰",
          color: "accountant",
          children: [
            { name: "Today's Collections", desc: "Total amount collected today (online + offline)", icon: "📊", color: "accountant" },
            { name: "Pending Dues Overview", desc: "Total outstanding across all students", icon: "📋", color: "accountant" },
            { name: "Class-wise Summary", desc: "Collection % per class", icon: "🏛️", color: "accountant" },
            { name: "Manual Entry Mismatch", desc: "Flag when cash collected doesn't match system records", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Receipt Generation",
          desc: "Create & print fee receipts",
          icon: "🧾",
          color: "accountant",
          children: [
            { name: "Online Payment Receipt", desc: "Auto-generated when online payment succeeds", icon: "💳", color: "accountant" },
            { name: "Offline Payment Receipt", desc: "Manually generate for cash/cheque payments", icon: "💵", color: "accountant" },
            { name: "Bulk Receipt Print", desc: "Print multiple receipts for a date range", icon: "🖨️", color: "accountant" },
            { name: "Duplicate Receipt Number", desc: "System enforces unique receipt numbers, block duplicates", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Expense Management",
          desc: "Track school operational expenses",
          icon: "💸",
          color: "accountant",
          children: [
            { name: "Add Expense", desc: "Category, amount, date, description", icon: "➕", color: "accountant" },
            { name: "Attach Receipt / Invoice", desc: "Upload vendor bill or invoice scan", icon: "📎", color: "accountant" },
            { name: "Approval Workflow", desc: "Expenses above threshold need Principal's approval", icon: "✅", color: "accountant" },
            { name: "Expense Exceeds Budget", desc: "Warn if category expense exceeds allocated budget", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Auto Reconciliation View",
          desc: "SmartCollect payment matching",
          icon: "🤖",
          color: "accountant",
          children: [
            { name: "SmartCollect Dashboard", desc: "Overview of all virtual account payments", icon: "📊", color: "accountant" },
            { name: "Matched Payments", desc: "Payments auto-matched to students", icon: "✅", color: "accountant" },
            { name: "Unmatched / Pending", desc: "Payments requiring manual resolution", icon: "⏳", color: "accountant" },
            { name: "Wrong Virtual Account", desc: "Payment sent to incorrect student's virtual account", icon: "⚠️", color: "edge", edge: true }
          ]
        },
        {
          name: "Financial Reports",
          desc: "Comprehensive financial analytics",
          icon: "📊",
          color: "accountant",
          children: [
            { name: "Income vs Expense", desc: "Monthly/yearly income vs expense comparison", icon: "📈", color: "accountant" },
            { name: "Monthly Statement", desc: "Detailed month-wise financial statement", icon: "📋", color: "accountant" },
            { name: "Tax-ready Export", desc: "Export data formatted for tax filing", icon: "📤", color: "accountant" },
            { name: "Audit Trail Log", desc: "Immutable log of all financial transactions", icon: "🔒", color: "accountant" }
          ]
        }
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

