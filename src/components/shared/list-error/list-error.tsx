import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

/**
 * Canonical list-level error + retry card (component-organization.md, decision
 * 0026 — consolidates `SDListError`/`SAListError`/`PLError`/
 * `InvitationsErrorState`, INFRA-shared-list-states).
 *
 * `role="alert"` so the failure is announced (moved, not changed, from all four
 * originals). Every point of real per-screen variance is a prop so the rendered
 * output stays pixel-identical per screen instead of being force-unified:
 * outer padding/border (`className`), icon treatment (`iconVariant`/`iconSize`),
 * retry affordance (`retryIcon`/`retryButtonVariant`/`retryButtonSize`) and the
 * title/description typography (`titleClassName`/`descriptionClassName`).
 *
 * Presentation-only: callers pass already-translated strings (it does NOT call
 * `useTranslations`).
 */
export interface ListErrorProps {
  onRetry: () => void;
  /** Already-translated retry button label. */
  retryLabel: string;
  /** Family A shape: one bold message line. Takes precedence over title/description. */
  message?: string;
  /** Family B shape: title + description lines. */
  title?: string;
  description?: string;
  /**
   * `plain` — bare AlertTriangle in `text-edu-error-text` (SD/SA/invitations).
   * `boxed` — icon in a tinted `rounded-2xl` box (parent-links). Default `plain`.
   */
  iconVariant?: "plain" | "boxed";
  /** AlertTriangle size: 10 (SD/SA), 12 (invitations), 6 inside the boxed variant. */
  iconSize: 6 | 10 | 12;
  /** Merged onto the outer card via cn() (per-screen padding/border/gap). */
  className?: string;
  /** Merged onto the title `<p>` via cn(). */
  titleClassName?: string;
  /** Merged onto the description `<p>` via cn(). */
  descriptionClassName?: string;
  retryButtonVariant?: "outline" | "secondary" | "default";
  retryButtonSize?: "default" | "sm";
  /** Merged onto the retry `<Button>` via cn() (per-screen top margin). */
  retryButtonClassName?: string;
  /** Icon inside the retry button — `rotate` (SD/SA), `refresh` (PL), `none` (invitations). */
  retryIcon?: "rotate" | "refresh" | "none";
}

/** Tailwind needs literal class names — no interpolated `size-${n}`. */
const ICON_SIZE_CLASS = {
  6: "size-6",
  10: "size-10",
  12: "size-12",
} as const;

const RETRY_ICON = {
  rotate: RotateCcw,
  refresh: RefreshCw,
} as const;

export function ListError({
  onRetry,
  retryLabel,
  message,
  title,
  description,
  iconVariant = "plain",
  iconSize,
  className,
  titleClassName,
  descriptionClassName,
  retryButtonVariant = "outline",
  retryButtonSize = "default",
  retryButtonClassName,
  retryIcon = "none",
}: ListErrorProps) {
  const iconClass = ICON_SIZE_CLASS[iconSize];
  const RetryIcon = retryIcon === "none" ? null : RETRY_ICON[retryIcon];

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center bg-card text-center",
        className,
      )}
    >
      {iconVariant === "boxed" ? (
        <div className="flex size-13 items-center justify-center rounded-2xl bg-edu-error-dark-light">
          <AlertTriangle
            className={cn(iconClass, "text-edu-error-dark")}
            aria-hidden="true"
          />
        </div>
      ) : (
        <AlertTriangle
          className={cn(iconClass, "text-edu-error-text")}
          aria-hidden="true"
        />
      )}

      {message ? (
        <p className="font-bold text-foreground text-sm">{message}</p>
      ) : (
        <>
          {title && (
            <p
              className={cn(
                "mt-3.5 font-extrabold text-base text-foreground",
                titleClassName,
              )}
            >
              {title}
            </p>
          )}
          {description && (
            <p
              className={cn(
                "mt-1 max-w-sm text-muted-foreground text-sm",
                descriptionClassName,
              )}
            >
              {description}
            </p>
          )}
        </>
      )}

      <Button
        type="button"
        variant={retryButtonVariant}
        size={retryButtonSize}
        onClick={onRetry}
        // ≥44px touch target on every screen (accessibility.md).
        className={cn("min-h-11", retryButtonClassName)}
      >
        {RetryIcon && <RetryIcon className="size-4" aria-hidden="true" />}
        {retryLabel}
      </Button>
    </div>
  );
}
