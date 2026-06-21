"use client";

import {
  CheckCircle2,
  Clock,
  FileText,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { scoreColorClass } from "@/features/exam/domain/calculate-score";
import {
  type ExamResult,
  isResultFinal,
  type QuestionResult,
} from "@/features/exam/domain/entities/exam-result.entity";
import { cn } from "@/shared/utils";
import type { ExamResultVm } from "./exam-result.i-vm";

type ReviewFilter = "all" | "correct" | "incorrect" | "skipped";

const FILTERS: ReviewFilter[] = ["all", "correct", "incorrect", "skipped"];

function filterLabelKey(
  f: ReviewFilter,
):
  | "result.filterAll"
  | "result.filterCorrect"
  | "result.filterIncorrect"
  | "result.filterSkipped" {
  switch (f) {
    case "all":
      return "result.filterAll";
    case "correct":
      return "result.filterCorrect";
    case "incorrect":
      return "result.filterIncorrect";
    case "skipped":
      return "result.filterSkipped";
  }
}

function categoryOf(q: QuestionResult): Exclude<ReviewFilter, "all"> {
  if (q.selectedOptionId === null) return "skipped";
  return q.isCorrect ? "correct" : "incorrect";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ExamResultScreen({
  result,
  onBackToList,
  gradeBookPath,
}: ExamResultVm) {
  const t = useTranslations("exam");
  const [filter, setFilter] = useState<ReviewFilter>("all");

  if (!isResultFinal(result)) {
    return (
      <PendingEssayResultView
        result={result}
        onBackToList={onBackToList}
        gradeBookPath={gradeBookPath}
      />
    );
  }

  // Final result — score/passed are guaranteed by the contract. Guard explicitly
  // (status→score link is not expressible in the type) without fabricating values.
  const score = result.score;
  const passed = result.passed;
  if (score === null || passed === null) {
    return (
      <PendingEssayResultView
        result={result}
        onBackToList={onBackToList}
        gradeBookPath={gradeBookPath}
      />
    );
  }

  const visible =
    filter === "all"
      ? result.questionResults
      : result.questionResults.filter((q) => categoryOf(q) === filter);

  const passTone: StatusTone = passed ? "success" : "error";

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1
          tabIndex={-1}
          // biome-ignore lint/a11y/noAutofocus: programmatic focus for step transition
          autoFocus
          className="text-2xl font-extrabold text-foreground"
        >
          {t("result.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{result.examTitle}</p>
      </header>

      {/* Score hero */}
      <div className="rounded-[var(--edu-radius-card)] border border-border bg-primary/10 p-8 text-center shadow-card">
        <p className="text-xs font-bold uppercase tracking-wide text-foreground">
          {t("result.scoreLabel")}
        </p>
        <div className="mt-2 flex items-end justify-center gap-1">
          <span
            className={cn(
              "text-6xl font-extrabold leading-none",
              scoreColorClass(score),
            )}
          >
            {score.toFixed(1)}
          </span>
          <span className="pb-1 text-xl font-bold text-muted-foreground">
            {t("result.outOf")}
          </span>
        </div>
        <div className="mt-3">
          <StatusBadge tone={passTone}>
            {passed ? t("result.passed") : t("result.failed")}
          </StatusBadge>
        </div>
        {(result.rank !== null || result.percentile !== null) && (
          <dl className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
            {result.rank !== null && (
              <div>
                <dt className="text-xs">{t("result.rank")}</dt>
                <dd className="font-bold text-foreground">#{result.rank}</dd>
              </div>
            )}
            {result.percentile !== null && (
              <div>
                <dt className="text-xs">{t("result.percentile")}</dt>
                <dd className="font-bold text-foreground">
                  {result.percentile}%
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs">{t("result.timeTaken")}</dt>
              <dd className="inline-flex items-center gap-1 font-bold text-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                {formatTime(result.timeTakenSeconds)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("result.correct")}
          value={String(result.correctCount)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label={t("result.incorrect")}
          value={String(result.incorrectCount)}
          icon={XCircle}
          tone="error"
        />
        <StatCard
          label={t("result.skipped")}
          value={String(result.skippedCount)}
          icon={MinusCircle}
          tone="muted"
        />
      </div>

      {/* Review */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground">
          {t("result.reviewTitle")}
        </h2>
        <ReviewFilterTabs filter={filter} onChange={setFilter} />

        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("result.filterEmpty")}
          </p>
        ) : (
          <ul className="space-y-4">
            {visible.map((q) => (
              <li key={q.questionId}>
                {q.type === "essay" ? (
                  <EssayQuestionReviewCard question={q} />
                ) : (
                  <QuestionReviewCard question={q} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button variant="outline" onClick={onBackToList}>
        {t("result.backToList")}
      </Button>
    </div>
  );
}

function PendingEssayResultView({
  result,
  onBackToList,
  gradeBookPath,
}: {
  result: ExamResult;
  onBackToList: () => void;
  gradeBookPath?: string;
}) {
  const t = useTranslations("exam");
  const [filter, setFilter] = useState<ReviewFilter>("all");

  const visible =
    filter === "all"
      ? result.questionResults
      : result.questionResults.filter((q) =>
          q.type === "essay" ? false : categoryOf(q) === filter,
        );

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1
          tabIndex={-1}
          // biome-ignore lint/a11y/noAutofocus: programmatic focus for step transition
          autoFocus
          className="text-2xl font-extrabold text-foreground"
        >
          {t("result.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{result.examTitle}</p>
      </header>

      {/* Partial-score hero */}
      <div className="rounded-[var(--edu-radius-card)] border border-border bg-primary/10 p-8 text-center shadow-card">
        <p className="text-xs font-bold uppercase tracking-wide text-foreground">
          {t("result.scoreLabel")}
        </p>
        <div className="mt-2 flex items-end justify-center gap-1">
          <span className="text-6xl font-extrabold leading-none text-edu-warning-text">
            {result.mcqScore !== null ? result.mcqScore.toFixed(1) : "—"}
          </span>
          <span className="pb-1 text-xl font-bold text-muted-foreground">
            /{result.mcqMax ?? "—"} · {t("result.mcqLabel")}
          </span>
        </div>
        <div className="mt-3">
          <StatusBadge tone="warning">
            {t("result.partialResultBadge")}
          </StatusBadge>
        </div>
      </div>

      {/* Pending essay banner */}
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-start gap-3 rounded-[var(--edu-radius-card)] border border-edu-warning/40 bg-edu-warning-light p-4"
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-edu-warning/20">
          <Clock className="size-5 text-edu-warning-text" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-edu-warning-text">
            {t("result.pendingEssayTitle")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("result.pendingEssayBody", {
              mcqScore: result.mcqScore?.toFixed(1) ?? "—",
              mcqMax: result.mcqMax ?? "—",
              essayMax: result.essayMax ?? "—",
            })}
          </p>
          {gradeBookPath && (
            <a
              href={gradeBookPath}
              className="mt-2 inline-block text-xs font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("result.viewGradeBook")}
            </a>
          )}
        </div>
      </div>

      {/* Stats row — MCQ stats + essay pending */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label={t("result.correct")}
          value={String(result.correctCount)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label={t("result.incorrect")}
          value={String(result.incorrectCount)}
          icon={XCircle}
          tone="error"
        />
        <StatCard
          label={t("result.skipped")}
          value={String(result.skippedCount)}
          icon={MinusCircle}
          tone="muted"
        />
        <StatCard
          label={t("result.essayPending")}
          value={String(result.essayCount)}
          icon={FileText}
          tone="warning"
        />
      </div>

      {/* Review */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground">
          {t("result.reviewTitle")}
        </h2>
        <ReviewFilterTabs filter={filter} onChange={setFilter} />

        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("result.filterEmpty")}
          </p>
        ) : (
          <ul className="space-y-4">
            {visible.map((q) => (
              <li key={q.questionId}>
                {q.type === "essay" ? (
                  <EssayQuestionReviewCard question={q} />
                ) : (
                  <QuestionReviewCard question={q} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button variant="outline" onClick={onBackToList}>
        {t("result.backToList")}
      </Button>
    </div>
  );
}

function ReviewFilterTabs({
  filter,
  onChange,
}: {
  filter: ReviewFilter;
  onChange: (f: ReviewFilter) => void;
}) {
  const t = useTranslations("exam");
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label={t("result.filterGroupLabel")}
    >
      {FILTERS.map((f) => {
        const active = filter === f;
        return (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(f)}
            className={cn(
              "min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/70",
            )}
          >
            {t(filterLabelKey(f))}
          </button>
        );
      })}
    </div>
  );
}

function EssayQuestionReviewCard({ question }: { question: QuestionResult }) {
  const t = useTranslations("exam");
  return (
    <article className="rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-foreground">
        {t("taking.questionLabel", { index: question.index })}
      </p>
      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-edu-warning/15 px-3 py-1 text-xs font-bold text-edu-warning-foreground">
        {t("result.essayQuestionLabel")}
      </div>
      <h3 className="mt-2 text-sm font-medium text-foreground">
        {question.text}
      </h3>
      {question.textAnswer && (
        <div className="mt-3 rounded-[var(--edu-radius-btn)] border border-border bg-muted/50 p-3 text-sm text-foreground">
          {question.textAnswer}
        </div>
      )}
    </article>
  );
}

function QuestionReviewCard({ question }: { question: QuestionResult }) {
  const t = useTranslations("exam");
  const wasWrong =
    question.isCorrect === false && question.selectedOptionId !== null;

  return (
    <article className="rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-foreground">
        {t("taking.questionLabel", { index: question.index })}
      </p>
      <h3 className="mt-1 text-sm font-medium text-foreground">
        {question.text}
      </h3>
      <ul className="mt-3 space-y-2">
        {question.options.map((opt) => {
          const isCorrect = opt.id === question.correctOptionId;
          const isSelectedWrong =
            opt.id === question.selectedOptionId && wasWrong;
          return (
            <li
              key={opt.id}
              aria-label={
                isCorrect
                  ? t("result.correctAnswer")
                  : isSelectedWrong
                    ? t("result.yourAnswer")
                    : undefined
              }
              className={cn(
                "flex items-center gap-3 rounded-[var(--edu-radius-btn)] border p-3 text-sm",
                isCorrect &&
                  "border-edu-success-text bg-edu-success/15 text-foreground",
                isSelectedWrong &&
                  "border-edu-error-text bg-edu-error/15 text-foreground",
                !isCorrect &&
                  !isSelectedWrong &&
                  "border-border bg-card text-foreground",
              )}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-foreground">
                {opt.id}
              </span>
              <span className="flex-1">{opt.text}</span>
              {isCorrect && (
                <span className="text-xs font-bold text-edu-success-text">
                  {t("result.correctAnswer")}
                </span>
              )}
              {isSelectedWrong && (
                <span className="text-xs font-bold text-edu-error-text">
                  {t("result.yourAnswer")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
