import {
  BarChart2,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileText,
  GraduationCap,
  Grid3x3,
  Layers,
  type LucideIcon,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Scale,
  School,
  ScrollText,
  Settings2,
  ShieldAlert,
  User,
  UserCog,
  Users,
  Users2,
} from "lucide-react";
import type messages from "@/bootstrap/i18n/messages/vi.json";

export type Role = "teacher" | "principal" | "student" | "parent" | "admin";

/** i18n keys under the `shell.nav` namespace — checked against messages. */
export type NavLabelKey = keyof (typeof messages)["shell"]["nav"];

export type NavItem = {
  href: string;
  labelKey: NavLabelKey;
  icon: LucideIcon;
};

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  teacher: [
    { href: "/teacher", labelKey: "dashboard", icon: BarChart3 },
    { href: "/teacher/classes", labelKey: "classes", icon: School },
    {
      href: "/teacher/attendance",
      labelKey: "attendance",
      icon: ClipboardList,
    },
    { href: "/teacher/class-log", labelKey: "classLog", icon: NotebookPen },
    { href: "/teacher/discipline", labelKey: "discipline", icon: Scale },
    { href: "/teacher/grades", labelKey: "grades", icon: GraduationCap },
    { href: "/teacher/schedule", labelKey: "schedule", icon: CalendarDays },
    { href: "/teacher/students", labelKey: "students", icon: Users },
    { href: "/messages", labelKey: "messages", icon: MessageSquare },
    { href: "/profile", labelKey: "profile", icon: User },
  ],
  principal: [
    { href: "/principal", labelKey: "dashboard", icon: BarChart3 },
    { href: "/principal/teachers", labelKey: "teachers", icon: UserCog },
    { href: "/principal/class-log", labelKey: "classLog", icon: NotebookPen },
    { href: "/principal/discipline", labelKey: "discipline", icon: Scale },
    {
      href: "/principal/moderation",
      labelKey: "moderation",
      icon: ShieldAlert,
    },
    { href: "/principal/students", labelKey: "students", icon: Users },
    { href: "/principal/classes", labelKey: "classes", icon: School },
    // US-E18.44 — the approver grade view (view + reject + term lock). The
    // reject capability lives ONLY here and on /admin/grade-book: /teacher/grades
    // is guarded by a strict `role === "teacher"` layout, so a principal can
    // never render it. Placed with the other academic-record entries, before the
    // shared /messages + /profile tail.
    { href: "/principal/grade-book", labelKey: "grades", icon: GraduationCap },
    { href: "/principal/schedule", labelKey: "schedule", icon: CalendarDays },
    { href: "/principal/reports", labelKey: "reports", icon: FileText },
    { href: "/messages", labelKey: "messages", icon: MessageSquare },
    { href: "/profile", labelKey: "profile", icon: User },
  ],
  student: [
    { href: "/student", labelKey: "overview", icon: BarChart3 },
    { href: "/student/courses", labelKey: "courses", icon: BookOpen },
    {
      href: "/student/assignments",
      labelKey: "assignments",
      icon: ClipboardList,
    },
    { href: "/student/exams", labelKey: "exams", icon: GraduationCap },
    { href: "/student/grades", labelKey: "grades", icon: GraduationCap },
    { href: "/student/conduct", labelKey: "conduct", icon: Scale },
    // US-E08.7 — student views their own class timetable, not a "teaching
    // schedule"; reuse the existing `timetable` key (already used by admin).
    { href: "/student/schedule", labelKey: "timetable", icon: CalendarDays },
    { href: "/messages", labelKey: "messages", icon: MessageSquare },
    { href: "/profile", labelKey: "profile", icon: User },
  ],
  parent: [
    { href: "/parent", labelKey: "overview", icon: BarChart3 },
    { href: "/parent/children", labelKey: "children", icon: Users },
    { href: "/parent/grades", labelKey: "grades", icon: GraduationCap },
    { href: "/parent/attendance", labelKey: "attendance", icon: ClipboardList },
    { href: "/parent/conduct", labelKey: "conduct", icon: Scale },
    { href: "/parent/discipline", labelKey: "discipline", icon: Scale },
    // US-E08.7 — parent views their child's class timetable, same rationale
    // as student; reuse the existing `timetable` key.
    { href: "/parent/schedule", labelKey: "timetable", icon: CalendarDays },
    { href: "/messages", labelKey: "messages", icon: MessageSquare },
    { href: "/profile", labelKey: "profile", icon: User },
  ],
  admin: [
    { href: "/admin/school-setup", labelKey: "schoolSetup", icon: Settings2 },
    {
      href: "/admin/calendar",
      labelKey: "academicCalendar",
      icon: CalendarRange,
    },
    {
      href: "/admin/subject-departments",
      labelKey: "subjectDepartments",
      icon: Layers,
    },
    { href: "/admin/subjects", labelKey: "subjects", icon: BookOpen },
    { href: "/admin/roster", labelKey: "studentRoster", icon: ClipboardList },
    { href: "/admin/classes", labelKey: "classManagement", icon: School },
    { href: "/admin/timetable", labelKey: "timetable", icon: Grid3x3 },
    {
      href: "/admin/assessment",
      labelKey: "assessmentScheme",
      icon: BarChart2,
    },
    // US-E18.44 — approver grade view, sibling of /principal/grade-book. Sits
    // next to the assessment scheme it grades against.
    { href: "/admin/grade-book", labelKey: "grades", icon: GraduationCap },
    { href: "/admin/staffing", labelKey: "staffing", icon: Users2 },
    { href: "/admin/staff-leave", labelKey: "staffLeave", icon: CalendarClock },
    {
      href: "/admin/announcements",
      labelKey: "announcements",
      icon: Megaphone,
    },
    { href: "/admin/audit-log", labelKey: "auditLog", icon: ScrollText },
  ],
};

export const DEFAULT_ROUTE: Record<Role, string> = {
  teacher: "/teacher",
  principal: "/principal",
  student: "/student",
  parent: "/parent",
  admin: "/admin/school-setup",
};

export const ROLE_LABEL_KEY: Record<
  Role,
  keyof (typeof messages)["shell"]["roles"]
> = {
  teacher: "teacher",
  principal: "principal",
  student: "student",
  parent: "parent",
  admin: "admin",
};
