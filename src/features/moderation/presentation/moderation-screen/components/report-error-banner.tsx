"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ReportErrorBannerProps {
  /** Already-translated title + message. */
  title: string;
  message: string;
  /** Retry affordance — hidden for non-retryable failures (e.g. 403). */
  showRetry?: boolean;
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * Feature-local error banner reused across the queue, detail sheet, and audit
 * tab (component-architecture flag #5 — a cross-feature promotion candidate,
 * tracked as a follow-up, built here parameterized). `role="alert"`; retry is
 * omitted entirely for non-retryable failures (forbidden).
 */
export function ReportErrorBanner({
  title,
  message,
  showRetry = true,
  retryLabel,
  onRetry,
}: ReportErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-[var(--edu-radius-card)] border border-border bg-card px-5 py-8 text-center"
    >
      <AlertTriangle
        aria-hidden="true"
        className="size-8 text-edu-error-text"
      />
      <p className="font-bold text-foreground">{title}</p>
      <p className="max-w-sm text-edu-text-secondary text-sm">{message}</p>
      {showRetry && onRetry && retryLabel && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
