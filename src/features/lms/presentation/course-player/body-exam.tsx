"use client";

import { Clock, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { isSafeHref } from "../shared/safe-href";
import type { ActiveItemVm } from "./course-player.i-vm";

export interface BodyExamProps {
  item: Extract<ActiveItemVm, { kind: "exam" }>;
}

/**
 * An EXAM tile: an intro block whose CTA follows the BE-computed state.
 *
 * `examUrl` is a deployment-configured deep link into core's exam flow — an
 * EXTERNAL origin, so it opens in a new tab with `rel="noopener noreferrer"`
 * and only after `isSafeHref` confirms it is http(s) (defence in depth: a
 * `javascript:` deep link must never reach an `href`, framework version aside).
 * Without a usable one we fall back to the in-app `/student/exams/[examId]`
 * route (same-origin `<Link>`), and if BE sent neither we say so instead of
 * rendering a dead button.
 *
 * The CTAs are the `Button` primitive via `asChild` rather than hand-rolled
 * anchors: that keeps the destructive tone, the focus ring and the 44px touch
 * target in ONE place (`components/ui/button`) instead of forking them here.
 *
 * The description lives in the pane's "Tổng quan" block (one copy, one place);
 * repeating it here would put the same sentence on screen twice.
 */
export function BodyExam({ item }: BodyExamProps) {
  const t = useTranslations("courses.player");
  const format = useFormatter();
  // An unsafe/unparseable deep link degrades to the in-app route below, which
  // is exactly what "no examUrl" already does.
  const examUrl =
    item.examUrl !== null && isSafeHref(item.examUrl) ? item.examUrl : null;

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-9 text-center sm:px-5">
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-2xl bg-edu-error-light"
      >
        <FileText className="size-7 text-edu-error-text" strokeWidth={1.8} />
      </span>
      <h2 className="font-extrabold text-[15px] text-foreground">
        {item.title}
      </h2>
      {item.examDurationMinutes !== null && (
        <p className="text-edu-text-secondary text-xs tabular-nums">
          {t("exam.duration", { minutes: item.examDurationMinutes })}
        </p>
      )}

      {item.state === "OPEN" &&
        (examUrl !== null ? (
          <Button asChild variant="destructive">
            <a href={examUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink strokeWidth={2.2} aria-hidden="true" />
              {t("exam.startExternal")}
            </a>
          </Button>
        ) : item.examHref !== null ? (
          <Button asChild variant="destructive">
            <Link href={item.examHref}>{t("exam.start")}</Link>
          </Button>
        ) : (
          <p className="text-edu-text-secondary text-sm">{t("exam.noLink")}</p>
        ))}

      {item.state === "CLOSED" &&
        (item.examHref !== null ? (
          <Button asChild variant="outline">
            <Link href={item.examHref}>{t("exam.review")}</Link>
          </Button>
        ) : (
          <p className="text-edu-text-secondary text-sm">{t("exam.noLink")}</p>
        ))}

      {item.state === "UPCOMING_HIDDEN" && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-edu-info-light px-4 py-1.5 font-bold text-foreground text-xs">
          <Clock className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          {item.startAt === null
            ? t("locked.opensAtUnknown")
            : t("exam.opensAt", {
                date: format.dateTime(new Date(item.startAt), {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
        </p>
      )}
    </div>
  );
}
