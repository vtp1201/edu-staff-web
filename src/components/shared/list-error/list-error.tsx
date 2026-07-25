import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

/**
 * Canonical list/section-level error + retry card (component-organization.md,
 * decision 0026 — consolidates `SDListError`/`SAListError`/`PLError`/
 * `InvitationsErrorState`/`ConsentError`, INFRA-shared-list-states).
 *
 * `role="alert"` so the failure is announced (moved, not changed, from all five
 * originals). Layout comes from a required `shape` preset so no caller repeats an
 * outer class literal; `className`/`titleClassName`/`descriptionClassName` remain
 * as escape hatches for the real per-screen deltas (padding, invitations'
 * typography).
 *
 * Presentation-only: callers pass already-translated strings (it does NOT call
 * `useTranslations`).
 */

/**
 * Content is a discriminated union: a card shows EITHER one bold `message` line
 * (Family A) OR a `title` (+ optional `description`) pair (Family B) — never
 * both. The `never` members make the wrong combination a compile error.
 */
type ListErrorContent =
  | { message: string; title?: never; description?: never }
  | { message?: never; title: string; description?: string };

interface ListErrorBaseProps {
  onRetry: () => void;
  /** Already-translated retry button label. */
  retryLabel: string;
  /**
   * Layout preset (supplies the outer card + retry-button spacing):
   * - `inline-card` — error-tinted `--edu-radius-card` card with `shadow-card`,
   *   `gap-3 px-5 py-10`; the retry sits in the flow gap (SD/SA message cards).
   * - `bordered-card` — plain `rounded-xl border-border` card, `px-6 py-12`;
   *   the retry gets `mt-4` (parent-links / invitations / parent-consent).
   */
  shape: "inline-card" | "bordered-card";
  /**
   * `plain` — bare AlertTriangle in `text-edu-error-text` (SD/SA/invitations).
   * `boxed` — icon in a tinted `rounded-2xl` box (parent-links/parent-consent).
   * Default `plain`.
   */
  iconVariant?: "plain" | "boxed";
  /** AlertTriangle size: 10 (SD/SA), 12 (invitations), 6 inside the boxed variant. */
  iconSize: 6 | 10 | 12;
  /** Merged onto the shape's outer classes via cn() — per-screen padding deltas. */
  className?: string;
  /**
   * REPLACES the title's default classes entirely (NOT merged) — pass the
   * complete class list, so the result never depends on tailwind-merge resolving
   * a conflict.
   */
  titleClassName?: string;
  /** REPLACES the description's default classes entirely (NOT merged). */
  descriptionClassName?: string;
  retryButtonVariant?: "outline" | "secondary" | "default";
  retryButtonSize?: "default" | "sm";
  /** Icon inside the retry button — `rotate` (SD/SA), `refresh` (PL/consent), `none` (invitations). */
  retryIcon?: "rotate" | "refresh" | "none";
}

export type ListErrorProps = ListErrorBaseProps & ListErrorContent;

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

const SHAPE = {
  "inline-card": {
    outer:
      "gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/20 px-5 py-10 shadow-card",
    retry: "min-h-11",
  },
  "bordered-card": {
    outer: "rounded-xl border border-border px-6 py-12",
    retry: "mt-4 min-h-11",
  },
} as const;

const DEFAULT_TITLE_CLASS = "mt-3.5 font-extrabold text-base text-foreground";
const DEFAULT_DESCRIPTION_CLASS = "mt-1 max-w-sm text-muted-foreground text-sm";

export function ListError({
  onRetry,
  retryLabel,
  message,
  title,
  description,
  shape,
  iconVariant = "plain",
  iconSize,
  className,
  titleClassName,
  descriptionClassName,
  retryButtonVariant = "outline",
  retryButtonSize = "default",
  retryIcon = "none",
}: ListErrorProps) {
  const iconClass = ICON_SIZE_CLASS[iconSize];
  const RetryIcon = retryIcon === "none" ? null : RETRY_ICON[retryIcon];
  const preset = SHAPE[shape];

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center bg-card text-center",
        preset.outer,
        className,
      )}
    >
      {iconVariant === "boxed" ? (
        // `edu-error-light`/`edu-error-text` (not `edu-error-dark`/`edu-error-dark-light`
        // — that pair is reserved for the "Nặng"/severe discipline-severity tone, ADR
        // 0040, and has no `.dark {}` override in tokens.css). This boxed icon carries
        // no severity meaning, so `edu-error-light`/`edu-error-text` is both the
        // semantically-correct AND the dark-mode-safe token pair (US-E21.2 already gave
        // it a proper `.dark {}` override) — fixes the dark-mode contrast gap
        // `fe-accessibility-auditor` flagged during INFRA-shared-list-states without a
        // new token/ADR.
        <div className="flex size-13 items-center justify-center rounded-2xl bg-edu-error-light">
          <AlertTriangle
            className={cn(iconClass, "text-edu-error-text")}
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
            <p className={titleClassName ?? DEFAULT_TITLE_CLASS}>{title}</p>
          )}
          {description && (
            <p className={descriptionClassName ?? DEFAULT_DESCRIPTION_CLASS}>
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
        className={preset.retry}
      >
        {RetryIcon && <RetryIcon className="size-4" aria-hidden="true" />}
        {retryLabel}
      </Button>
    </div>
  );
}
