import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PLErrorProps {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}

/**
 * List-level error state + retry (AC-001.5). `role="alert"` announces the
 * failure. Feature-local (no generic shared error-state component exists — same
 * false-cognate finding as invitations; flagged as a promotion candidate).
 */
export function PLError({
  title,
  description,
  retryLabel,
  onRetry,
}: PLErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-13 text-center"
    >
      <div className="flex size-13 items-center justify-center rounded-2xl bg-edu-error-dark-light">
        <AlertTriangle
          className="size-6 text-edu-error-dark"
          aria-hidden="true"
        />
      </div>
      <p className="mt-3.5 font-extrabold text-base text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-muted-foreground text-sm">
        {description}
      </p>
      <Button type="button" size="sm" onClick={onRetry} className="mt-4">
        <RefreshCw className="size-4" aria-hidden="true" />
        {retryLabel}
      </Button>
    </div>
  );
}
