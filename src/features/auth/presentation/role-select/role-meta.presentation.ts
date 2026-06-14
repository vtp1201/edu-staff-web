import {
  BookOpen,
  Briefcase,
  type LucideIcon,
  School,
  UserCheck,
  Users,
} from "lucide-react";

/**
 * Presentation-only metadata per BE role enum: icon + brand colour token +
 * i18n label key. Domain owns the enum→appRole/landing mapping (`role-meta.ts`);
 * this file owns nothing the domain cares about (icons/colours/copy keys).
 */
export interface RolePresentation {
  icon: LucideIcon;
  /** CSS variable reference resolved at render via inline style (dynamic tint). */
  colorVar: string;
  /** i18n key path under `auth.roles.<enum>.label`. */
  labelKey: string;
}

export const ROLE_PRESENTATION: Record<string, RolePresentation> = {
  TEACHER: {
    icon: UserCheck,
    colorVar: "var(--edu-role-teacher)",
    labelKey: "TEACHER",
  },
  ADMIN: {
    icon: School,
    colorVar: "var(--edu-role-principal)",
    labelKey: "ADMIN",
  },
  MANAGER: {
    icon: School,
    colorVar: "var(--edu-role-principal)",
    labelKey: "MANAGER",
  },
  STAFF: {
    icon: Briefcase,
    colorVar: "var(--edu-purple)",
    labelKey: "STAFF",
  },
  STUDENT: {
    icon: BookOpen,
    colorVar: "var(--edu-role-student)",
    labelKey: "STUDENT",
  },
  PARENT: {
    icon: Users,
    colorVar: "var(--edu-role-parent)",
    labelKey: "PARENT",
  },
};
