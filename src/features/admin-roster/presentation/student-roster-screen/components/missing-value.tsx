"use client";

import { useTranslations } from "next-intl";

/**
 * Honest placeholder for a roster field the backend genuinely does not have
 * (US-E18.35): a student who never filled in dob/gender (optional per user,
 * ADR-0122), a member the IAM lookup could not resolve, or the student code —
 * which exists in NO core/IAM contract.
 *
 * It is a placeholder, never an error: nothing is broken, the value simply is
 * not recorded. The em dash is `aria-hidden` and paired with sr-only text so a
 * screen reader hears "chưa cập nhật" instead of "dash" (a11y: meaning is never
 * carried by a glyph alone).
 *
 * Feature-local on purpose — only `RosterTable` renders it today. Promote to
 * `components/shared/` (move, never copy) on the second consumer.
 */
export function MissingValue() {
  const t = useTranslations("adminRoster");
  return (
    <span className="text-edu-text-secondary">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{t("table.notProvided")}</span>
    </span>
  );
}
