"use client";

import { BookOpen, ClipboardCheck, NotebookPen, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/shared/utils";
import type { TeacherClassVM } from "../teacher-classes-screen.i-vm";

export function ClassCard({ vm }: { vm: TeacherClassVM }) {
  const t = useTranslations("teacherClasses");

  return (
    <article className="flex flex-col gap-4 rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card">
      <header className="flex items-start justify-between gap-2">
        <span className="grid size-13 shrink-0 place-items-center rounded-[var(--edu-radius-card)] bg-primary/15">
          <BookOpen className="size-6 text-primary" aria-hidden="true" />
        </span>
        {vm.isHomeroom && (
          <StatusBadge tone="success" className="border border-edu-success/30">
            {t("homeroomBadge")}
          </StatusBadge>
        )}
      </header>

      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-bold text-edu-text-primary">
          {vm.name}
        </h2>
        <p className="mt-0.5 text-xs text-edu-text-secondary">
          {t("gradeLevel", { grade: vm.gradeLevel })}
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-edu-text-secondary">
          <Users className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">{vm.studentCount}</span>{" "}
          {t("students")}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Link
          href={vm.studentsHref}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--edu-radius-btn)]",
            "bg-edu-primary-accessible px-3.5 py-2 text-[13px] font-bold text-primary-foreground",
            "motion-safe:transition-colors hover:opacity-90",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        >
          <Users className="size-4" aria-hidden="true" />
          {t("actions.viewStudents")}
        </Link>

        <ComingSoonAction
          label={t("actions.attendance")}
          comingSoon={t("actions.comingSoon")}
          icon={<ClipboardCheck className="size-4" aria-hidden="true" />}
        />
        <ComingSoonAction
          label={t("actions.classLog")}
          comingSoon={t("actions.comingSoon")}
          icon={<NotebookPen className="size-4" aria-hidden="true" />}
        />
      </div>
    </article>
  );
}

function ComingSoonAction({
  label,
  comingSoon,
  icon,
}: {
  label: string;
  comingSoon: string;
  icon: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* aria-disabled (not `disabled`) keeps the control focusable so keyboard
            users can read the "coming soon" tooltip; onClick is a no-op. */}
        <button
          type="button"
          aria-disabled="true"
          aria-label={`${label} — ${comingSoon}`}
          onClick={(e) => e.preventDefault()}
          className={cn(
            "inline-flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-[var(--edu-radius-btn)]",
            "border border-border px-3.5 py-2 text-[13px] font-bold text-edu-text-muted",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        >
          {icon}
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent>{comingSoon}</TooltipContent>
    </Tooltip>
  );
}
