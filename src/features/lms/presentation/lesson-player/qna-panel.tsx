"use client";

import { MessageSquare } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface QnaQuestionVm {
  id: string;
  question: string;
  answer: string | null;
}

export interface QnaPanelProps {
  lessonId: string;
  questions: QnaQuestionVm[];
  isSubmitting: boolean;
  errorKey: string | null;
  onAsk: (lessonId: string, question: string) => void;
  labels: {
    emptyState: string;
    inputPlaceholder: string;
    submitButton: string;
    submitting: string;
    unanswered: string;
    error: string;
  };
}

/** Q&A list (newest first) + ask form. Optimistic prepend handled by parent. */
export function QnaPanel({
  lessonId,
  questions,
  isSubmitting,
  errorKey,
  onAsk,
  labels,
}: QnaPanelProps) {
  const [draft, setDraft] = useState("");
  const fieldId = useId();

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAsk(lessonId, trimmed);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="sr-only">
          {labels.inputPlaceholder}
        </label>
        <Textarea
          id={fieldId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={labels.inputPlaceholder}
          className="min-h-16 resize-y"
        />
        <div>
          <Button
            type="button"
            disabled={isSubmitting || draft.trim().length === 0}
            onClick={submit}
          >
            {isSubmitting ? labels.submitting : labels.submitButton}
          </Button>
        </div>
        {errorKey && (
          <p role="alert" className="text-edu-error-text text-xs">
            {labels.error}
          </p>
        )}
      </div>

      {questions.length === 0 ? (
        <EmptyState icon={MessageSquare} title={labels.emptyState} />
      ) : (
        <ul className="flex flex-col gap-3">
          {questions.map((q) => (
            <li
              key={q.id}
              className="rounded-[var(--edu-radius-card)] border border-border bg-card p-3.5"
            >
              <p className="font-semibold text-foreground text-sm">
                {q.question}
              </p>
              {q.answer ? (
                <p className="mt-1.5 text-edu-text-secondary text-sm leading-relaxed">
                  {q.answer}
                </p>
              ) : (
                <p className="mt-1.5 text-edu-text-secondary text-xs italic">
                  {labels.unanswered}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
