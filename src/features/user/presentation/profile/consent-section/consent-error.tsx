import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConsentErrorProps {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}

/**
 * Section-scoped error + retry (AC-003.1/.3). `role="alert"` announces the
 * failure; retry is a real `<Button>` (native keyboard semantics). Kept
 * feature-local — NOT promoted from `PLError` this story (identical shape but a
 * cross-feature move is out of scope; component-architecture §5.1). Reuses the
 * AA-proven `edu-error-dark` token pair from `PLError`.
 */
export function ConsentError({
  title,
  description,
  retryLabel,
  onRetry,
}: ConsentErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-10 text-center"
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
