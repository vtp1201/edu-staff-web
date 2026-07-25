import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PLSectionErrorBannerProps {
  /** Already-translated message — this component never calls useTranslations. */
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

/**
 * Small inline error banner for a SUB-SECTION of the detail dialog (consent
 * detail + audit trail). Deliberately NOT `components/shared/list-error`: that
 * component's whole shape-family is a large centred card (`items-center
 * text-center`, `px-5 py-10`), whereas this is a compact left-aligned banner
 * scoped inside an already-rendered dialog region.
 *
 * Canonical home for this shape (decision `0026`) — both sub-sections render
 * it instead of duplicating the markup. Presentation-only: callers pass
 * already-translated strings, matching the `labels` convention of the sections.
 */
export function PLSectionErrorBanner({
  message,
  retryLabel,
  onRetry,
}: PLSectionErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-lg bg-edu-error/10 px-3 py-2.5"
    >
      <p className="flex items-start gap-1.5 text-edu-error-text text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {message}
      </p>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
