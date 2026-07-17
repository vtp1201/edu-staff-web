"use client";

import { X } from "lucide-react";
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
 * — `question-bank` is the 2nd consumer. Zero feature-domain import: caller
 * passes `maxTags`/`maxTagLength` instead of this component reading a
 * feature's entity-file constants.
 */
export function TagChipsInput({
  tags,
  isLocked,
  onChange,
  maxTags,
  maxTagLength,
  labels,
}: TagChipsInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<"max" | "long" | null>(null);
  const helpId = useId();

  const commit = () => {
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
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-primary/12 px-2 py-0.5 font-bold text-[11.5px] text-primary"
          >
            {tag}
            {!isLocked && (
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={labels.removeAriaLabelOf(tag)}
                className="inline-flex items-center justify-center rounded-sm hover:text-primary/70 max-sm:min-h-11 max-sm:min-w-11"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {!isLocked && (
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commit();
              }
            }}
            onBlur={commit}
            placeholder={tags.length === 0 ? labels.placeholder : ""}
            aria-label={labels.inputAriaLabel}
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
