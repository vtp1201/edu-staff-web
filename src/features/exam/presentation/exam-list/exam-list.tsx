"use client";

import { CheckCircle2, ClipboardList, Clock, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type {
  ExamStatus,
  ExamSummary,
} from "@/features/exam/domain/entities/exam.entity";
import { cn } from "@/shared/utils";
import type { ExamListVm } from "./exam-list.i-vm";

type FilterKey = "all" | ExamStatus;

const FILTERS: FilterKey[] = ["all", "available", "completed", "expired"];

const STATUS_TONE: Record<ExamStatus, StatusTone> = {
  available: "primary",
  completed: "success",
  expired: "muted",
};

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

export function ExamListScreen({ exams }: ExamListVm) {
  const t = useTranslations("exam");
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");

  const availableCount = exams.filter((e) => e.status === "available").length;
  const completedExams = exams.filter((e) => e.status === "completed");
  const avgScore = useMemo(() => {
    if (completedExams.length === 0) return "—";
    // List summary does not carry per-exam scores (mock-first, lms service pending).
    // Return a neutral placeholder rather than fabricated data. (tech-lead review)
    return "—";
  }, [completedExams]);

  const filtered =
    filter === "all" ? exams : exams.filter((e) => e.status === filter);

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("page.subtitle")}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("stats.available")}
          value={String(availableCount)}
          icon={ClipboardList}
          tone="primary"
        />
        <StatCard
          label={t("stats.completed")}
          value={String(completedExams.length)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label={t("stats.avgScore")}
          value={avgScore}
          icon={FileText}
          tone="info"
        />
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("filter.groupLabel")}
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className={cn(
                "min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/70",
              )}
            >
              {t(`filter.${f}`)}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--edu-radius-card)] border border-border bg-card p-10 text-center">
          <h2 className="text-base font-bold text-foreground">
            {t("empty.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("empty.subtitle")}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {filtered.map((exam) => (
            <li key={exam.id}>
              <ExamCard
                exam={exam}
                onOpen={() => router.push(`exams/${exam.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExamCard({ exam, onOpen }: { exam: ExamSummary; onOpen: () => void }) {
  const t = useTranslations("exam");
  const isExpired = exam.status === "expired";
  const isCompleted = exam.status === "completed";

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card",
        isExpired && "opacity-65",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
            {exam.subjectName}
          </p>
          <h3 className="mt-0.5 text-[15px] font-bold text-foreground">
            {exam.title}
          </h3>
        </div>
        <StatusBadge tone={STATUS_TONE[exam.status]}>
          {t(`status.${exam.status}`)}
        </StatusBadge>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">
        {exam.description}
      </p>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
        <div className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden="true" />
          <span>{t("card.duration", { minutes: exam.durationMinutes })}</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="size-3.5" aria-hidden="true" />
          <span>{t("card.questions", { count: exam.totalQuestions })}</span>
        </div>
        <div>{t("card.teacher", { name: exam.teacherName })}</div>
      </dl>

      <p className="text-xs text-foreground">
        {t("card.deadline", {
          date: formatDeadline(exam.deadline),
        })}
      </p>

      <div className="mt-auto pt-1">
        {isExpired ? (
          <Button variant="outline" disabled className="w-full">
            {t("cta.expired")}
          </Button>
        ) : (
          <Button
            variant={isCompleted ? "outline" : "default"}
            className="w-full"
            onClick={onOpen}
          >
            {isCompleted ? t("cta.viewResult") : t("cta.start")}
          </Button>
        )}
      </div>
    </article>
  );
}
