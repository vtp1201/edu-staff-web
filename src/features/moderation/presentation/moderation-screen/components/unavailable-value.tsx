"use client";

import { useTranslations } from "next-intl";

/**
 * Placeholder for a field the SERVER does not return (US-E18.32) — the reporter
 * identity (omitted by design, NFR-098-01) and the denormalized content
 * preview/author. Renders the conventional em-dash visually plus a
 * screen-reader-only phrase, so an assistive-tech user hears "không có dữ liệu"
 * instead of a punctuation mark (or nothing at all).
 *
 * Deliberately NOT a made-up value ("Ẩn danh", "Người dùng"): "we did not
 * receive this" and "the data says X" must never look the same.
 */
export function UnavailableValue() {
  const t = useTranslations("moderation");
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{t("unavailable")}</span>
    </span>
  );
}
