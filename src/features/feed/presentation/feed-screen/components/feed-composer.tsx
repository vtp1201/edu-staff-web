"use client";

import { AlertTriangle, Image as ImageIcon, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef, useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";

export interface FeedComposerProps {
  meAvatarInitials: string;
  /** Drives the placeholder copy (school vs class name). */
  activeScopeLabel: { kind: "school" } | { kind: "class"; className: string };
  isSubmitting: boolean;
  /** 422 — inline, content preserved (AC-1902.5). */
  fieldError?: { message: string };
  /** 403 — distinct copy (AC-1902.6). */
  forbiddenError?: { message: string };
  /** Retryable transient (AC-1902.7). */
  transientError?: { message: string };
  /**
   * Incremented by the host on a CONFIRMED create success → clears draft +
   * attach. Content is otherwise preserved (never cleared on submit or error),
   * satisfying AC-1902.5/.6/.7.
   */
  resetSignal?: number;
  onSubmit: (input: { content: string; hasAttachment: boolean }) => void;
}

/**
 * Post composer (FR-003). Owns only its own draft/attach UI state; the final
 * `{content, hasAttachment}` crosses the boundary on submit. Rendered by the
 * container ONLY when `canPost` is true (absent otherwise — AC-1902.1/.2). The
 * textarea `ref` is forwarded so the empty-state CTA can focus it.
 */
export const FeedComposer = forwardRef<HTMLTextAreaElement, FeedComposerProps>(
  function FeedComposer(
    {
      meAvatarInitials,
      activeScopeLabel,
      isSubmitting,
      fieldError,
      forbiddenError,
      transientError,
      resetSignal,
      onSubmit,
    },
    ref,
  ) {
    const t = useTranslations("feed.composer");
    const [draft, setDraft] = useState("");
    const [attach, setAttach] = useState(false);

    // Clear only on a confirmed success signal — never on submit/error so
    // content is preserved for retry (AC-1902.5/.6/.7).
    useEffect(() => {
      if (resetSignal !== undefined) {
        setDraft("");
        setAttach(false);
      }
    }, [resetSignal]);

    const placeholder =
      activeScopeLabel.kind === "school"
        ? t("placeholderSchool")
        : t("placeholderClass", { className: activeScopeLabel.className });

    const inlineError =
      fieldError?.message ??
      forbiddenError?.message ??
      transientError?.message ??
      null;

    const submit = () => {
      const v = draft.trim();
      if (!v || isSubmitting) return;
      // Do NOT clear here — the host clears via resetSignal only on success.
      onSubmit({ content: v, hasAttachment: attach });
    };

    return (
      <section className="rounded-[var(--edu-radius-card)] border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-10">
            <AvatarFallback className="text-primary">
              {meAvatarInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Textarea
              ref={ref}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isSubmitting}
              rows={draft ? 3 : 1}
              aria-label={t("contentLabel")}
              placeholder={placeholder}
              className="resize-none"
            />
            {attach && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-border border-dashed bg-muted px-2.5 py-1.5">
                <ImageIcon
                  aria-hidden="true"
                  className="size-3.5 text-edu-text-secondary"
                />
                <span className="flex-1 text-[12px] text-edu-text-secondary">
                  {t("attachedMock")}
                </span>
                <button
                  type="button"
                  onClick={() => setAttach(false)}
                  aria-label={t("removeImage")}
                  className="inline-flex size-6 items-center justify-center text-edu-text-secondary"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </div>
            )}
            {inlineError && (
              <p
                role="alert"
                className="mt-2 flex items-start gap-1.5 text-edu-error-text text-sm"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                {inlineError}
              </p>
            )}
            <div className="mt-2.5 flex items-center justify-between">
              <button
                type="button"
                aria-pressed={attach}
                aria-label={t("attachImage")}
                onClick={() => setAttach((a) => !a)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold text-[12.5px]",
                  attach
                    ? "bg-primary/12 text-primary"
                    : "text-edu-text-secondary hover:bg-muted",
                )}
              >
                <ImageIcon aria-hidden="true" className="size-4" />
                {t("photo")}
              </button>
              <Button
                type="button"
                size="sm"
                onClick={submit}
                disabled={!draft.trim() || isSubmitting}
                aria-busy={isSubmitting}
              >
                <Send aria-hidden="true" className="size-4" />
                {isSubmitting ? t("posting") : t("post")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  },
);
