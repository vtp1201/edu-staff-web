import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface InvitationsErrorStateProps {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}

/**
 * Fetch-error state + retry (AC-001.4/.5). `role="alert"` so it's announced.
 * Feature-local per the inline-error-state convention every sibling admin
 * screen uses (component-architecture.md §0 — 3rd-instance promotion candidate,
 * deliberately deferred).
 */
export function InvitationsErrorState({
  title,
  description,
  retryLabel,
  onRetry,
}: InvitationsErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-border bg-card px-5 py-12 text-center"
    >
      <AlertTriangle
        className="size-12 text-edu-error-text"
        aria-hidden="true"
      />
      <p className="mt-4 font-bold text-base text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-edu-text-secondary text-sm">
        {description}
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={onRetry}
        className="mt-4"
      >
        {retryLabel}
      </Button>
    </div>
  );
}
