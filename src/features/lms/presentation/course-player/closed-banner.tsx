"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * "Đã đóng — chỉ xem để ôn tập." for a LESSON/DOCUMENT past its window.
 *
 * ASSIGNMENT and EXAM do NOT use this: a closed assignment has consequences
 * ("Bạn chưa nộp bài này trước hạn.") and a closed exam offers a review link,
 * so both render their own closed state inside their body.
 *
 * The lock glyph is decoration; the sentence carries the whole meaning.
 */
export function ClosedBanner() {
  const t = useTranslations("courses.player");

  return (
    <p className="mx-4 mb-2.5 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 font-semibold text-edu-text-secondary text-xs sm:mx-5">
      <Lock
        className="size-3.5 shrink-0"
        strokeWidth={2.2}
        aria-hidden="true"
      />
      {t("closedBanner")}
    </p>
  );
}
