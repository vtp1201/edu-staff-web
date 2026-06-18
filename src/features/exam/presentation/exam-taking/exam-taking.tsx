"use client";

import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/shared/utils";
import type { ExamAnswer, ExamTakingVm } from "./exam-taking.i-vm";
import { ExamTakingTimer } from "./exam-taking-timer";
import { QuestionNavigator } from "./question-navigator";
import { SubmitModal } from "./submit-modal";

export function ExamTakingScreen({
  exam,
  questions,
  startedAt,
  onSubmit,
}: ExamTakingVm) {
  const t = useTranslations("exam");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showSubmit, setShowSubmit] = useState(false);

  const current = questions[currentIndex];

  const answeredIds = useMemo(() => new Set(answers.keys()), [answers]);

  const buildAnswers = useCallback((): ExamAnswer[] => {
    return questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers.get(q.id) ?? null,
    }));
  }, [questions, answers]);

  const handleSubmit = useCallback(() => {
    onSubmit(buildAnswers(), startedAt);
  }, [onSubmit, buildAnswers, startedAt]);

  if (!current) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8 text-muted-foreground">
        {t("errors.not-found")}
      </div>
    );
  }

  const selectOption = (optionId: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(current.id, optionId);
      return next;
    });
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
  };

  const isFlagged = flagged.has(current.id);
  const answeredCount = answeredIds.size;
  const progressPct = (answeredCount / questions.length) * 100;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-border border-b bg-card px-6 py-3">
        <h1
          tabIndex={-1}
          // biome-ignore lint/a11y/noAutofocus: programmatic focus for step transition
          autoFocus
          className="truncate text-[15px] font-bold text-foreground"
        >
          {exam.title}
        </h1>
        <div className="flex items-center gap-3">
          <ExamTakingTimer
            startedAt={startedAt}
            durationMinutes={exam.durationMinutes}
            onExpire={handleSubmit}
          />
          <Button size="sm" onClick={() => setShowSubmit(true)}>
            {t("taking.submitBtn")}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
        {/* Left pane — question + options */}
        <section className="flex flex-1 flex-col">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground">
            {t("taking.questionLabel", { index: current.index })}
          </p>
          <h2 className="mt-2 text-base font-medium text-foreground">
            {current.text}
          </h2>

          <ul className="mt-5 space-y-3">
            {current.options.map((opt) => {
              const selected = answers.get(current.id) === opt.id;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--edu-radius-btn)] border p-4 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted/50",
                    )}
                  >
                    <span className="sr-only">
                      {t("taking.optionLabel", { option: opt.id })}:{" "}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {opt.id}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              {t("taking.prevBtn")}
            </Button>
            <Button
              variant={isFlagged ? "secondary" : "outline"}
              onClick={toggleFlag}
            >
              <Flag className="size-4" aria-hidden="true" />
              {isFlagged ? t("taking.unflagBtn") : t("taking.flagBtn")}
            </Button>
            <Button
              variant="outline"
              disabled={currentIndex === questions.length - 1}
              onClick={() =>
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
              }
            >
              {t("taking.nextBtn")}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>

        {/* Right pane — navigator + progress */}
        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <div className="rounded-[var(--edu-radius-card)] border border-border bg-card p-4 shadow-card">
            <p className="mb-3 text-sm text-muted-foreground">
              {t("taking.progress", {
                answered: answeredCount,
                total: questions.length,
              })}
            </p>
            <Progress
              value={progressPct}
              className="mb-4"
              aria-label={t("taking.progressLabel")}
              aria-valuetext={t("taking.progress", {
                answered: answeredCount,
                total: questions.length,
              })}
            />
            <QuestionNavigator
              questions={questions}
              currentIndex={currentIndex}
              answeredIds={answeredIds}
              flaggedIds={flagged}
              onJump={setCurrentIndex}
            />
          </div>
        </aside>
      </div>

      <SubmitModal
        open={showSubmit}
        onOpenChange={setShowSubmit}
        answeredCount={answeredCount}
        totalCount={questions.length}
        onConfirm={handleSubmit}
      />
    </div>
  );
}
