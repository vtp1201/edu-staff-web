"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";
import type { ExamSummary } from "@/features/exam/domain/entities/exam.entity";
import type { ExamQuestion } from "@/features/exam/domain/entities/exam-question.entity";
import type { ExamResult } from "@/features/exam/domain/entities/exam-result.entity";
import type { ExamFailure } from "@/features/exam/domain/failures/exam.failure";
import { ExamBriefingScreen } from "../exam-briefing/exam-briefing";
import { ExamResultScreen } from "../exam-result/exam-result";
import { ExamTakingScreen } from "./exam-taking";
import type { ExamAnswer } from "./exam-taking.i-vm";

export type SubmitAnswerPayload = {
  questionId: string;
  selectedOptionId: string | null;
};

export type SubmitExamActionResult =
  | { ok: true; result: ExamResult }
  | { ok: false; errorKey: ExamFailure["type"] };

export type SubmitExamAction = (
  examId: string,
  answers: SubmitAnswerPayload[],
  startedAt: number,
) => Promise<SubmitExamActionResult>;

type Step = "briefing" | "taking" | "result";

export interface ExamDetailScreenProps {
  exam: ExamSummary;
  questions: ExamQuestion[];
  /** Pre-loaded result when the exam is already completed. */
  initialResult?: ExamResult | null;
  submitExamAction: SubmitExamAction;
}

export function ExamDetailScreen({
  exam,
  questions,
  initialResult = null,
  submitExamAction,
}: ExamDetailScreenProps) {
  const t = useTranslations("exam");
  const router = useRouter();

  const [step, setStep] = useState<Step>(initialResult ? "result" : "briefing");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<ExamResult | null>(initialResult);
  const [errorKey, setErrorKey] = useState<ExamFailure["type"] | null>(null);
  const [, startTransition] = useTransition();

  const backToList = useCallback(() => router.push("../exams"), [router]);

  const handleStart = useCallback(() => {
    setStartedAt(Date.now());
    setStep("taking");
  }, []);

  const handleSubmit = useCallback(
    (answers: ExamAnswer[], started: number) => {
      setErrorKey(null);
      startTransition(async () => {
        const outcome = await submitExamAction(exam.id, answers, started);
        if (outcome.ok) {
          setResult(outcome.result);
          setStep("result");
        } else {
          setErrorKey(outcome.errorKey);
        }
      });
    },
    [exam.id, submitExamAction],
  );

  if (step === "briefing") {
    return (
      <>
        {errorKey && <ErrorBanner message={t(`errors.${errorKey}`)} />}
        <ExamBriefingScreen exam={exam} onStart={handleStart} />
      </>
    );
  }

  if (step === "taking" && startedAt !== null) {
    return (
      <>
        {errorKey && <ErrorBanner message={t(`errors.${errorKey}`)} />}
        <ExamTakingScreen
          exam={exam}
          questions={questions}
          startedAt={startedAt}
          onSubmit={handleSubmit}
        />
      </>
    );
  }

  if (step === "result" && result) {
    return <ExamResultScreen result={result} onBackToList={backToList} />;
  }

  // Fallback (e.g. completed exam without a loadable result).
  return (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      {t("errors.unknown")}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mx-6 mt-6 rounded-[var(--edu-radius-btn)] bg-edu-error/15 px-4 py-3 text-sm text-edu-error-text"
    >
      {message}
    </div>
  );
}
