import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FeedErrorStateProps {
  /** Already-translated title + message. */
  title: string;
  message: string;
  /** false for forbidden/scope-not-found — no retry control rendered at all. */
  showRetry: boolean;
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * Feed error state. Prop shape copied from moderation's `ReportErrorBanner`
 * (component-architecture §0.1 — a 4th occurrence of the same inline-error
 * shape, flagged to fe-lead as a shared-promotion candidate). `role="alert"`;
 * retry is omitted ENTIRELY (not disabled) for non-retryable failures.
 */
export function FeedErrorState({
  title,
  message,
  showRetry,
  retryLabel,
  onRetry,
}: FeedErrorStateProps) {
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
