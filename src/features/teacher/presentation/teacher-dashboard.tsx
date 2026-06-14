import { makeGetTeacherDashboardUseCase } from "@/bootstrap/di/teacher-dashboard.di";
import { TeacherDashboardHomeClient } from "./teacher-dashboard-home/teacher-dashboard-home";
import type { TeacherDashboardVM } from "./teacher-dashboard-home/teacher-dashboard-home.i-vm";

/** Periods 1–5 = morning, 6+ = afternoon (presentation-local; mirrors the mapper). */
function sessionKey(period: number): "morning" | "afternoon" {
  return period <= 5 ? "morning" : "afternoon";
}

/** Notification tone key → design-system CSS variable (resolved at presentation). */
const NOTIF_COLOR_VAR: Record<string, string> = {
  primary: "var(--edu-primary)",
  success: "var(--edu-success)",
  warning: "var(--edu-warning)",
  error: "var(--edu-error)",
  info: "var(--edu-info)",
  purple: "var(--edu-purple)",
};

/** Vietnamese-aware initials (first letter of last two words). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

/**
 * RSC wrapper — resolves the use-case server-side, maps the domain result to a
 * ViewModel, and renders the client dashboard. Failure → null stats + empty
 * lists so the client renders its loading/empty states (no throw).
 */
export async function TeacherDashboard() {
  const useCase = await makeGetTeacherDashboardUseCase();
  const result = await useCase.execute();

  const vm: TeacherDashboardVM = result.ok
    ? {
        totalStudents: result.data.stats.totalStudents,
        totalClasses: result.data.stats.totalClasses,
        classesToday: result.data.stats.classesToday,
        pendingGradesCount: result.data.stats.pendingGradesCount,
        pendingApprovalCount: result.data.stats.pendingApprovalCount,
        newMessagesCount: result.data.stats.newMessagesCount,
        scheduleItems: result.data.scheduleItems.map((s) => ({
          period: s.period,
          sessionKey: sessionKey(s.period),
          subject: s.subject,
          className: s.className,
          room: s.room,
          status: s.status,
        })),
        pendingGradeItems: result.data.pendingGradeItems.map((g) => ({
          studentName: g.studentName,
          initials: initialsOf(g.studentName),
          assessmentType: g.assessmentType,
          className: g.className,
        })),
        notifications: result.data.notifications.map((n) => ({
          icon: n.icon,
          colorVar: NOTIF_COLOR_VAR[n.color] ?? "var(--edu-primary)",
          message: n.message,
          timeAgo: n.timeAgo,
        })),
        gradesPath: "grades",
      }
    : {
        totalStudents: null,
        totalClasses: null,
        classesToday: 0,
        pendingGradesCount: 0,
        pendingApprovalCount: 0,
        newMessagesCount: 0,
        scheduleItems: [],
        pendingGradeItems: [],
        notifications: [],
        gradesPath: "grades",
      };

  return <TeacherDashboardHomeClient vm={vm} />;
}
