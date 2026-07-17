"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LessonPlanErrorStateProps {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

/** Fetch-error surface (role="alert") with a real retry button (AC-006.5/007.6). */
export function LessonPlanErrorState({
  title,
  message,
  retryLabel,
  onRetry,
}: LessonPlanErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-border bg-card px-5 py-10 text-center"
    >
      <AlertTriangle
        className="size-12 text-edu-error-text"
        aria-hidden="true"
      />
      <p className="mt-4 font-bold text-base text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-edu-text-secondary text-sm">{message}</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onRetry}
        className="mt-4"
      >
        <RefreshCw className="mr-1.5 size-4" aria-hidden="true" />
        {retryLabel}
      </Button>
    </div>
  );
}
