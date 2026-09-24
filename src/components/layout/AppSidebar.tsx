import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  FileText,
  CreditCard,
  Settings,
  Bell,
  Bus,
  Library,
  Store,
  DollarSign,
  ClipboardList,
  Building
} from "lucide-react"

type Role = 
  | "MASTER_ADMIN"
  | "SUPER_ADMIN"
  | "STAFF"
  | "TEACHER"
  | "STUDENT"
  | "PARENT"
  | "LIBRARIAN"
  | "STORE_MANAGER"
  | "ACCOUNTANT"

interface SidebarItem {
  title: string
  href: string
  icon: React.ElementType
}

const roleNavMapping: Record<Role, SidebarItem[]> = {
  MASTER_ADMIN: [
    { title: "Dashboard", href: "/master", icon: LayoutDashboard },
    { title: "Schools", href: "/master/schools", icon: Building },
    { title: "Subscriptions", href: "/master/subscriptions", icon: CreditCard },
    { title: "Global Settings", href: "/master/settings", icon: Settings },
  ],
  SUPER_ADMIN: [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Sessions", href: "/admin/sessions", icon: CalendarDays },
    { title: "Classes", href: "/admin/classes", icon: BookOpen },
    { title: "Teachers", href: "/admin/teachers", icon: Users },
    { title: "Front Office", href: "/admin/front-office", icon: FileText },
    { title: "Admissions", href: "/admin/admissions", icon: ClipboardList },
    { title: "Students", href: "/admin/students", icon: GraduationCap },
    { title: "Notice Board", href: "/admin/notices", icon: Bell },
    { title: "Timetable", href: "/admin/timetable", icon: CalendarDays },
    { title: "Settings", href: "/admin/settings", icon: Settings },
  ],
  STAFF: [
    { title: "Dashboard", href: "/staff", icon: LayoutDashboard },
    { title: "Admissions", href: "/staff/admissions", icon: ClipboardList },
    { title: "Students", href: "/staff/students", icon: GraduationCap },
    { title: "Transport", href: "/staff/transport", icon: Bus },
  ],
  TEACHER: [
    { title: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { title: "My Classes", href: "/teacher/classes", icon: BookOpen },
    { title: "Attendance", href: "/teacher/attendance", icon: ClipboardList },
    { title: "Homework", href: "/teacher/homework", icon: FileText },
    { title: "Marks Entry", href: "/teacher/marks", icon: FileText },
    { title: "Leave Apply", href: "/teacher/leave", icon: CalendarDays },
  ],
  STUDENT: [
    { title: "Dashboard", href: "/student", icon: LayoutDashboard },
    { title: "Attendance", href: "/student/attendance", icon: ClipboardList },
    { title: "Homework", href: "/student/homework", icon: FileText },
    { title: "Results", href: "/student/results", icon: GraduationCap },
    { title: "Timetable", href: "/student/timetable", icon: CalendarDays },
  ],
  PARENT: [
    { title: "Dashboard", href: "/parent", icon: LayoutDashboard },
    { title: "Child Progress", href: "/parent/progress", icon: GraduationCap },
    { title: "Fee Payment", href: "/parent/fees", icon: CreditCard },
    { title: "Apply Leave", href: "/parent/leave", icon: FileText },
  ],
  LIBRARIAN: [
    { title: "Dashboard", href: "/librarian", icon: LayoutDashboard },
    { title: "Books", href: "/librarian/books", icon: Library },
    { title: "Issues/Returns", href: "/librarian/issues", icon: BookOpen },
  ],
  STORE_MANAGER: [
    { title: "Dashboard", href: "/store", icon: LayoutDashboard },
    { title: "Inventory", href: "/store/inventory", icon: Store },
    { title: "Sales/POS", href: "/store/pos", icon: DollarSign },
  ],
  ACCOUNTANT: [
    { title: "Dashboard", href: "/accountant", icon: LayoutDashboard },
    { title: "Fee Collection", href: "/accountant/fees", icon: CreditCard },
    { title: "Expenses", href: "/accountant/expenses", icon: DollarSign },
    { title: "Payroll", href: "/accountant/payroll", icon: Users },
  ],
}

interface AppSidebarProps {
  role: string;
  schoolName?: string;
  schoolLogo?: string | null;
}

export default function AppSidebar({ role, schoolName = "SchoolSaathi", schoolLogo }: AppSidebarProps) {
  const normalizedRole = (role || "STUDENT") as Role
  const navItems = roleNavMapping[normalizedRole] || roleNavMapping.STUDENT

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* Brand Logo Area */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white truncate">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-school-primary text-white overflow-hidden">
            {schoolLogo ? (
              <img src={schoolLogo} alt={schoolName} className="h-full w-full object-cover" />
            ) : (
              <GraduationCap className="h-5 w-5" />
            )}
          </div>
          <span className="text-lg tracking-tight truncate" title={schoolName}>{schoolName}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-school-primary-50 hover:text-school-primary-700 dark:text-slate-300 dark:hover:bg-school-primary-950 dark:hover:text-school-primary-300"
              >
                <Icon className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-school-primary-500 dark:text-slate-500" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Area (e.g., Support or version) */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-900 dark:text-white">Need Help?</p>
          <p className="mt-1 text-[11px] text-slate-500">Contact IT Support</p>
        </div>
      </div>
    </aside>
  )
}
