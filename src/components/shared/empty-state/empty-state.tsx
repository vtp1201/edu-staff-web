import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

/**
 * Canonical empty state — the `emptyStatePattern` from design-spec.jsonc:
 * centered column, 64px icon (aria-hidden), 16px/700 title as a `<p>`
 * (no heading-hierarchy disruption), optional body + CTA. `role="status"` so
 * screen readers announce the empty state.
 *
 * A11y note: the icon uses `text-edu-text-secondary` (#5A6A85 = 5.48:1 on the
 * white card) — NOT `text-edu-text-muted`, despite design-spec.jsonc's
 * `emptyStatePattern.icon.color: var(--edu-text-muted)` literally naming that
 * token. `text-edu-text-muted` (#8898A9) is only 2.95:1 on white, below the
 * repo's ≥3:1 icon-contrast floor (WCAG 1.4.11, accessibility.md; DR-GATE-002
 * precedent). This is a corrected accessible implementation of the canonical
 * pattern, not a design deviation.
 *
 * This component is presentation-only: callers pass already-translated strings
 * (it does NOT call `useTranslations`), so it stays framework-neutral and
 * reusable across features (component-organization.md, decision 0026).
 */
export type EmptyStateProps = {
  icon: LucideIcon;
  /** Already-translated title text. */
  title: string;
  /** Already-translated optional body text. */
  body?: string;
  cta?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: "default" | "secondary";
  };
  /** Merged onto the outer container via cn(). */
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center px-5 py-10 text-center",
        className,
      )}
    >
      <Icon className="size-16 text-edu-text-secondary" aria-hidden="true" />
      <p className="mt-4 font-bold text-base text-foreground">{title}</p>
      {body && (
        <p className="mt-2 max-w-xs text-muted-foreground text-sm">{body}</p>
      )}
      {cta && (
        <Button
          type="button"
          size="sm"
          variant={cta.variant ?? "default"}
          onClick={cta.onClick}
          className="mt-4"
        >
          {cta.icon && (
            <cta.icon className="mr-1.5 size-4" aria-hidden="true" />
          )}
          {cta.label}
        </Button>
      )}
    </div>
  );
}
