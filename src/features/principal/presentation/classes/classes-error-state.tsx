"use client";

import { Button } from "@/components/ui/button";

export interface ClassesErrorStateProps {
  /**
   * `network` = retryable (network/5xx/timeout, AC-1.6). `forbidden` = 403
   * `CLASS_FORBIDDEN` (AC-1.7) — the retry control is ABSENT, not disabled, so
   * it can never become a dead tab stop.
   */
  variant: "network" | "forbidden";
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ClassesErrorState({
  variant,
  message,
  retryLabel,
  onRetry,
}: ClassesErrorStateProps) {
  return (
    <div
      className="rounded-card border border-edu-error/30 bg-edu-error/10 p-6 text-center text-edu-error-text text-sm"
      role="alert"
    >
      <p>{message}</p>
      {variant === "network" && retryLabel && onRetry && (
        <Button
          className="mt-3"
          onClick={onRetry}
          type="button"
          variant="outline"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
