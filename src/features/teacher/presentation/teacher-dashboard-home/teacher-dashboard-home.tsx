"use client";

import {
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  type LucideIcon,
  MessageSquare,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { cn } from "@/shared/utils";
import type {
  NotificationVM,
  TeacherDashboardVM,
} from "./teacher-dashboard-home.i-vm";

/** lucide icon key → component (notification rows). */
const NOTIF_ICON: Record<string, LucideIcon> = {
  calendar: Calendar,
  users: Users,
  fileText: FileText,
  clock: Clock,
  messageSquare: MessageSquare,
};

const SCHEDULE_TONE: Record<"done" | "live" | "upcoming", StatusTone> = {
  done: "muted",
  live: "success",
  upcoming: "warning",
};

export function TeacherDashboardHomeClient({ vm }: { vm: TeacherDashboardVM }) {
  const t = useTranslations("teacherDashboard");

  return (
    <div className="space-y-5">
      <h1 className="sr-only">{t("pageTitle")}</h1>
      {/* ── Stats grid ─────────────────────────────────── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatCard
          label={t("stats.totalStudents")}
          value={vm.totalStudents === null ? "—" : String(vm.totalStudents)}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label={t("stats.classesToday")}
          value={String(vm.classesToday)}
          icon={Clock}
          tone="success"
        />
        <StatCard
          label={t("stats.pendingGrades")}
          value={String(vm.pendingGradesCount)}
          icon={ClipboardList}
          tone="warning"
          {...(vm.pendingGradesCount > 0
            ? { trend: { dir: "down" as const, value: t("stats.vsPrevWeek") } }
            : {})}
        />
        <div className="flex flex-col">
          <StatCard
            label={t("stats.pendingApproval")}
            value={String(vm.pendingApprovalCount)}
            icon={Clock}
            tone="warning"
          />
          <p className="mt-1 text-center text-[10px] font-medium text-edu-text-secondary">
            {t("stats.adminApprovalMode")}
          </p>
        </div>
        <StatCard
          label={t("stats.newMessages")}
          value={String(vm.newMessagesCount)}
          icon={MessageSquare}
          tone="purple"
        />
      </div>

      {/* ── Body grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <ScheduleCard vm={vm} />

        <div className="flex flex-col gap-4">
          <PendingGradesCard vm={vm} />
          <NotificationsCard vm={vm} />
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ vm }: { vm: TeacherDashboardVM }) {
  const t = useTranslations("teacherDashboard");
  return (
    <section className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <header className="flex items-center justify-between px-6 py-4">
        <h2 className="text-[15px] font-bold text-foreground">
          {t("schedule.title")}
        </h2>
        <StatusBadge tone="primary">{t("schedule.dayLabel")}</StatusBadge>
      </header>
      {vm.scheduleItems.length === 0 ? (
        <p className="px-6 pb-6 text-center text-sm text-edu-text-secondary">
          {t("schedule.empty")}
        </p>
      ) : (
        <ul className="border-border border-t">
          {vm.scheduleItems.map((item) => (
            <li
              key={item.period}
              className={cn(
                "flex items-center gap-4 border-l-[3px] px-6 py-3",
                item.status === "live"
                  ? "border-edu-success"
                  : "border-transparent",
              )}
            >
              <div className="w-20 shrink-0">
                <div className="text-[12.5px] font-extrabold text-foreground">
                  {t("schedule.period", { period: item.period })}
                </div>
                <div className="text-[10px] text-edu-text-secondary">
                  {t(`schedule.${item.sessionKey}`)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold text-foreground">
                  {item.subject}
                </div>
                <div className="truncate text-[12px] text-edu-text-secondary">
                  {t("schedule.classRoom", {
                    className: item.className,
                    room: item.room,
                  })}
                </div>
              </div>
              <StatusBadge tone={SCHEDULE_TONE[item.status]}>
                {t(`scheduleStatus.${item.status}`)}
              </StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PendingGradesCard({ vm }: { vm: TeacherDashboardVM }) {
  const t = useTranslations("teacherDashboard");
  return (
    <section className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <header className="flex items-center justify-between px-5 py-4">
        <h2 className="text-[15px] font-bold text-foreground">
          {t("pendingGrades.title")}
        </h2>
        <StatusBadge tone="warning">
          {String(vm.pendingGradesCount)}
        </StatusBadge>
      </header>
      {vm.pendingGradeItems.length === 0 ? (
        <p className="px-5 pb-5 text-center text-sm text-edu-text-secondary">
          {t("schedule.empty")}
        </p>
      ) : (
        <ul className="border-border border-t">
          {vm.pendingGradeItems.map((item) => (
            <li
              key={`${item.studentName}-${item.className}`}
              className="flex items-center gap-3 px-5 py-2.5"
            >
              <span
                aria-hidden="true"
                className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
              >
                {item.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-bold text-foreground">
                  {item.studentName}
                </div>
                <div className="truncate text-[11px] text-edu-text-secondary">
                  {t("pendingGrades.assessmentType", {
                    type: item.assessmentType,
                    className: item.className,
                  })}
                </div>
              </div>
              <Link
                href={vm.gradesPath}
                aria-label={`${t("pendingGrades.enterGrades")} - ${item.studentName}`}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--edu-radius-btn)] bg-edu-primary-accessible px-[11px] py-[5px] text-[11px] font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t("pendingGrades.enterGrades")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NotificationsCard({ vm }: { vm: TeacherDashboardVM }) {
  const t = useTranslations("teacherDashboard");
  return (
    <section className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <header className="px-5 py-4">
        <h2 className="text-[15px] font-bold text-foreground">
          {t("notifications.title")}
        </h2>
      </header>
      {vm.notifications.length === 0 ? (
        <p className="px-5 pb-5 text-center text-sm text-edu-text-secondary">
          {t("schedule.empty")}
        </p>
      ) : (
        <ul className="border-border border-t">
          {vm.notifications.map((n) => (
            <NotificationRow key={`${n.icon}-${n.message}`} n={n} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NotificationRow({ n }: { n: NotificationVM }) {
  const Icon = NOTIF_ICON[n.icon] ?? Calendar;
  return (
    <li className="flex items-start gap-2.5 px-5 py-2.5">
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-[8px]"
        style={{
          background: `color-mix(in srgb, ${n.colorVar} 18%, transparent)`,
        }}
      >
        <Icon className="size-3.5" style={{ color: n.colorVar }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-foreground">{n.message}</p>
        <p className="text-[11px] text-edu-text-secondary">{n.timeAgo}</p>
      </div>
    </li>
  );
}
