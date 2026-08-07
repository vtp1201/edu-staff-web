import type { LucideIcon } from "lucide-react";
import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

export type InvitationNoticeTone = "error" | "warning";

interface InvitationNoticeProps {
  /** `error` = dead/blocked; `warning` = time-related or transient. */
  tone: InvitationNoticeTone;
  icon: LucideIcon;
  title: string;
  body: string;
  /** Optional "contact the school office" style line, rendered in a chip. */
  hint?: string;
  /** Trailing text link (usually back to sign-in). */
  linkLabel: string;
  linkHref: string;
  /** Optional primary affordance (a CTA button/link) above the text link. */
  children?: ReactNode;
}

const TONE = {
  error: {
    halo: "bg-edu-error-light",
    border: "border-edu-error-text",
    icon: "text-edu-error-text",
  },
  warning: {
    halo: "bg-edu-warning-light",
    border: "border-edu-warning-text",
    icon: "text-edu-warning-text",
  },
} as const;

/**
 * Terminal/blocked state of an invitation flow: haloed icon, title, body, an
 * optional advice chip, an optional primary action and a trailing text link.
 *
 * Canonical home for a pattern BOTH invitation screens need (decision `0026`,
 * promote-don't-copy): it was `invite-accept-screen`'s local `TokenError` until
 * the public redeem screen (US-E18.53) needed the same shape for its five
 * non-form states. Moved here verbatim — same classes, same DOM — so the accept
 * screen's existing stories keep passing.
 *
 * Content is caller-owned (already-translated strings): this component has no
 * i18n namespace of its own, so each screen keeps its own copy.
 */
export function InvitationNotice({
  tone,
  icon: Icon,
  title,
  body,
  hint,
  linkLabel,
  linkHref,
  children,
}: InvitationNoticeProps) {
  const t = TONE[tone];
  return (
    <div role="alert" className="flex flex-col items-center gap-4 text-center">
      <div className="relative size-24">
        <div className={cn("absolute inset-0 rounded-full", t.halo)} />
        <div
          className={cn(
            "absolute inset-3.5 flex items-center justify-center rounded-full border border-dashed bg-card",
            t.border,
          )}
        >
          <Icon
            className={cn("size-8", t.icon)}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>
      </div>
      <h1 className="text-lg font-extrabold text-foreground">{title}</h1>
      <p className="max-w-[360px] text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      {hint && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-muted-foreground">
          <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {hint}
        </div>
      )}
      {children}
      <a
        href={linkHref}
        className="inline-flex min-h-11 items-center font-bold text-primary hover:underline"
      >
        {linkLabel}
      </a>
    </div>
  );
}
