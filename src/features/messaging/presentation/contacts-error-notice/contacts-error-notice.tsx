"use client";

import { useTranslations } from "next-intl";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import { cn } from "@/shared/utils";

export interface ContactsErrorNoticeProps {
  /** Stable failure key from the server (`messaging.errors.<type>`). */
  errorKey: MessagingFailure["type"];
  className?: string;
}

/**
 * US-E18.52 (review fix) — the contact-directory read failed, so the picker has
 * NOTHING to show and must say why. Without this banner an empty picker reads
 * as "this school has no teachers" instead of "we could not reach the
 * directory".
 *
 * One canonical home for the three pickers that consume `initialContacts`
 * (new-conversation / create-group / add-members, decision 0026). The markup
 * deliberately mirrors the already-proven `conversation-list` load-error banner
 * rather than inventing a second error convention; `ListError`
 * (`components/shared/list-error`) is not used here because it is a full-height
 * card built around a retry control, and these contacts are SSR-loaded — there
 * is no client retry to offer inside the dialog.
 */
export function ContactsErrorNotice({
  errorKey,
  className,
}: ContactsErrorNoticeProps) {
  const tErrors = useTranslations("messaging.errors");
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-edu-error/30 bg-edu-error-light px-3 py-2.5 text-edu-error-text text-sm",
        className,
      )}
    >
      {tErrors(errorKey)}
    </div>
  );
}
