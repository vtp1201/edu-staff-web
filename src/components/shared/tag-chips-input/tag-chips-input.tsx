"use client";

import { AlertTriangle, X } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/shared/utils";

export interface TagChipsInputProps {
  tags: string[];
  isLocked: boolean;
  onChange: (tags: string[]) => void;
  /** Caller-supplied cap on tag count (was a lesson-plan entity constant pre-promotion). */
  maxTags: number;
  /** Caller-supplied cap on a single tag's char length. */
  maxTagLength: number;
  /**
   * Optional per-tag validity predicate (US-E21.1). When provided, the
   * component enters "validated multi-value" mode:
   *   - each committed tag is rendered valid (primary tint) or invalid
   *     (error-dark tint + inline AlertTriangle icon) per `validate(tag)`;
   *   - commit splits on commas / semicolons / whitespace so a pasted or typed
   *     multi-email string becomes several chips, each validated independently;
   *   - Space also commits.
   * When omitted (default) behaviour is UNCHANGED — single-value commit on
   * Enter/comma, all chips render identically — so the existing `lesson-plan` /
   * `question-bank` consumers are unaffected.
   */
  validate?: (tag: string) => boolean;
  /**
   * Id of the caller's aggregate error message (the `role="alert"` element).
   * When set, each invalid chip (per `validate`) gets `aria-invalid` +
   * `aria-describedby` pointing here, so a screen reader ties the invalid chip
   * to the explanation. Optional — omitted by the non-validating consumers.
   */
  invalidDescribedBy?: string;
  /**
   * Optional id of a visible `<label>` to link the input to (`aria-labelledby`),
   * making the visible label the single source of truth. Falls back to
   * `labels.inputAriaLabel` when omitted (backward-compatible).
   */
  labelledBy?: string;
  labels: {
    placeholder: string;
    inputAriaLabel: string;
    maxTagsHelper: string;
    tagTooLongError: string;
    removeAriaLabelOf: (tag: string) => string;
  };
}

/**
 * Tag-chips input. Owns only its uncommitted draft text; the committed
 * `tags[]` is a controlled prop. Enter/comma/blur commits; duplicates are
 * silently ignored; the `maxTags + 1`th add is blocked with an inline helper;
 * a tag over `maxTagLength` shows an inline error and is not added; each
 * remove button names its specific tag and is hidden entirely when locked.
 *
 * Promoted from `features/lesson-plan/presentation/lesson-plan-builder-screen/
 * lp-tag-chips-input.tsx` (US-E11.9, component-organization.md decision 0026)
 * — `question-bank` is the 2nd consumer, `admin/invitations` the 3rd (via the
 * optional `validate` prop). Zero feature-domain import: caller passes
 * `maxTags`/`maxTagLength`/`validate` instead of this component reading a
 * feature's entity-file constants.
 */
export function TagChipsInput({
  tags,
  isLocked,
  onChange,
  maxTags,
  maxTagLength,
  validate,
  labelledBy,
  invalidDescribedBy,
  labels,
}: TagChipsInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<"max" | "long" | null>(null);
  const helpId = useId();
  const isMultiValue = validate !== undefined;

  const addMany = (candidates: string[]) => {
    const seen = new Set(tags.map((t) => t.toLowerCase()));
    const next = [...tags];
    let hitMax = false;
    let hitLong = false;
    for (const raw of candidates) {
      const value = raw.trim();
      if (!value) continue;
      if (seen.has(value.toLowerCase())) continue;
      if (value.length > maxTagLength) {
        hitLong = true;
        continue;
      }
      if (next.length >= maxTags) {
        hitMax = true;
        continue;
      }
      seen.add(value.toLowerCase());
      next.push(value);
    }
    if (next.length !== tags.length) onChange(next);
    setError(hitLong ? "long" : hitMax ? "max" : null);
  };

  const commit = () => {
    if (isMultiValue) {
      const parts = draft.split(/[,;\s]+/);
      if (parts.every((p) => !p.trim())) return;
      addMany(parts);
      setDraft("");
      return;
    }
    // Single-value mode (unchanged legacy behaviour).
    const value = draft.trim();
    if (!value) return;
    if (tags.includes(value)) {
      setDraft("");
      return; // silent duplicate ignore
    }
    if (value.length > maxTagLength) {
      setError("long");
      return;
    }
    if (tags.length >= maxTags) {
      setError("max");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
    setError(null);
  };

  const remove = (tag: string) => onChange(tags.filter((x) => x !== tag));

  return (
    <div>
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5",
          isLocked ? "bg-muted" : "bg-card",
        )}
      >
        {tags.map((tag) => {
          const invalid = validate ? !validate(tag) : false;
          return (
            <span
              key={tag}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? invalidDescribedBy : undefined}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold text-[11.5px]",
                invalid
                  ? "border border-edu-error-dark/40 bg-edu-error-dark-light text-edu-error-dark"
                  : "bg-primary/12 text-primary",
              )}
            >
              {invalid && (
                <AlertTriangle className="size-3" aria-hidden="true" />
              )}
              {tag}
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  aria-label={labels.removeAriaLabelOf(tag)}
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm",
                    invalid
                      ? "hover:text-edu-error-dark/70"
                      : "hover:text-primary/70",
                  )}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              )}
            </span>
          );
        })}
        {!isLocked && (
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" ||
                e.key === "," ||
                (isMultiValue && e.key === " ")
              ) {
                if (isMultiValue && e.key === " " && !draft.trim()) return;
                e.preventDefault();
                commit();
              }
            }}
            onBlur={commit}
            placeholder={tags.length === 0 ? labels.placeholder : ""}
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : labels.inputAriaLabel}
            aria-describedby={error ? helpId : undefined}
            className="min-w-24 flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>
      {error && (
        <p
          id={helpId}
          role="alert"
          className="mt-1.5 text-edu-error-text text-xs"
        >
          {error === "max" ? labels.maxTagsHelper : labels.tagTooLongError}
        </p>
      )}
    </div>
  );
}
