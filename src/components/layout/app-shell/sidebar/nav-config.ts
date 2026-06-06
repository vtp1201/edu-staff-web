import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  type LucideIcon,
  MessageSquare,
  NotebookPen,
  School,
  User,
  UserCog,
  Users,
} from "lucide-react";
import type messages from "@/bootstrap/i18n/messages/vi.json";

export type Role = "teacher" | "principal" | "student" | "parent";

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
    { href: "/teacher/grades", labelKey: "grades", icon: GraduationCap },
    { href: "/teacher/schedule", labelKey: "schedule", icon: CalendarDays },
    { href: "/teacher/students", labelKey: "students", icon: Users },
    { href: "/teacher/messages", labelKey: "messages", icon: MessageSquare },
    { href: "/profile", labelKey: "profile", icon: User },
  ],
  principal: [
    { href: "/principal", labelKey: "dashboard", icon: BarChart3 },
    { href: "/principal/teachers", labelKey: "teachers", icon: UserCog },
    { href: "/principal/students", labelKey: "students", icon: Users },
    { href: "/principal/classes", labelKey: "classes", icon: School },
    { href: "/principal/schedule", labelKey: "schedule", icon: CalendarDays },
    { href: "/principal/reports", labelKey: "reports", icon: FileText },
    { href: "/principal/messages", labelKey: "messages", icon: MessageSquare },
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
    { href: "/student/schedule", labelKey: "schedule", icon: CalendarDays },
    { href: "/student/resources", labelKey: "resources", icon: FileText },
    { href: "/student/messages", labelKey: "messages", icon: MessageSquare },
    { href: "/profile", labelKey: "profile", icon: User },
  ],
  parent: [
    { href: "/parent", labelKey: "overview", icon: BarChart3 },
    { href: "/parent/children", labelKey: "children", icon: Users },
    { href: "/parent/grades", labelKey: "grades", icon: GraduationCap },
    { href: "/parent/attendance", labelKey: "attendance", icon: ClipboardList },
    { href: "/parent/schedule", labelKey: "schedule", icon: CalendarDays },
    { href: "/parent/messages", labelKey: "messages", icon: MessageSquare },
    { href: "/profile", labelKey: "profile", icon: User },
  ],
};

export const ROLE_LABEL_KEY: Record<
  Role,
  keyof (typeof messages)["shell"]["roles"]
> = {
  teacher: "teacher",
  principal: "principal",
  student: "student",
  parent: "parent",
};
