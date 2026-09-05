import { AlertTriangle, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatItemWindow } from "@/features/lms/domain/use-cases/format-item-window";
import { cn } from "@/shared/utils";
import { ItemStatePill } from "../shared/item-state-pill";
import { ItemTypeChip } from "../shared/item-type-chip";
import type { CrossSubjectRowVm } from "./cross-subject.i-vm";

export interface CrossSubjectRowProps {
  row: CrossSubjectRowVm;
}

/**
 * One row of the cross-subject list (design-spec `crossSubjectList.row`).
 *
 * ONE interactive element per row — the trailing CTA. The card itself is not a
 * link: an outer link plus an inner button would nest interactive elements,
 * and the two targets differ (an open exam starts the exam, everything else
 * opens the course). Because several rows show the same button copy, the CTA
 * carries an `aria-label` naming the item, so a screen-reader link list is not
 * six identical "Xem trong khoá học" entries.
 *
 * Urgency is never colour alone (WCAG 1.4.1): the border tint is the third
 * channel behind a warning ICON and the literal text "còn N giờ". WHETHER a row
 * is urgent was decided server-side against one `now`; this component formats.
 *
 * No "✓ Đã nộp" decoration: nothing on the wire carries a per-student
 * submission flag for a timeline item (US-E24.5's deviation D-1, extended here
 * — see `cross-subject.i-vm.ts`).
 */
export function CrossSubjectRow({ row }: CrossSubjectRowProps) {
  const t = useTranslations("courses");
  const format = useFormatter();

  const itemWindow = formatItemWindow(row, (date) =>
    format.dateTime(date, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  const windowText =
    itemWindow.kind === "range"
      ? t("timeline.window.range", {
          start: itemWindow.startText,
          due: itemWindow.dueText,
        })
      : itemWindow.kind === "from"
        ? t("timeline.window.from", { start: itemWindow.startText })
        : itemWindow.kind === "due"
          ? t("timeline.window.due", { due: itemWindow.dueText })
          : t("timeline.window.always");

  const cta =
    row.cta.kind === "start"
      ? {
          label: row.cta.external
            ? t("cross.cta.startExternal")
            : t("cross.cta.start"),
          ariaLabel: t("cross.cta.startAria", { title: row.title }),
        }
      : {
          label: t("cross.cta.view"),
          ariaLabel: t("cross.cta.viewAria", {
            title: row.title,
            course: row.courseTitle,
          }),
        };

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[var(--edu-radius-card)] border bg-card px-4 py-3.5 shadow-card",
        row.urgent ? "border-edu-error/45" : "border-border",
      )}
    >
      <ItemTypeChip
        itemType={row.itemType}
        locked={row.state === "UPCOMING_HIDDEN"}
      />

      <div className="min-w-0 flex-1 basis-44">
        <p
          className={cn(
            "font-bold text-[13.5px]",
            row.state === "CLOSED"
              ? "text-edu-text-secondary"
              : "text-foreground",
          )}
        >
          {row.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge tone={row.tone}>{row.courseTitle}</StatusBadge>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11.5px] tabular-nums",
              row.urgent
                ? "font-bold text-edu-error-text"
                : "text-muted-foreground",
            )}
          >
            {row.urgent && (
              <AlertTriangle
                className="size-3 shrink-0"
                strokeWidth={2.4}
                aria-hidden="true"
              />
            )}
            {row.hoursLeft !== null
              ? `${windowText} · ${t("cross.urgent", { hours: row.hoursLeft })}`
              : windowText}
          </span>
        </div>
      </div>

      <ItemStatePill
        state={row.state}
        examLocked={row.state === "UPCOMING_HIDDEN"}
      />

      <Button
        asChild
        size="sm"
        variant={row.cta.kind === "start" ? "destructive" : "outline"}
      >
        {row.cta.external ? (
          <a
            href={row.cta.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={cta.ariaLabel}
          >
            <ExternalLink strokeWidth={2.2} aria-hidden="true" />
            {cta.label}
          </a>
        ) : (
          <Link href={row.cta.href} aria-label={cta.ariaLabel}>
            {cta.label}
            {row.cta.kind === "view" && (
              <ChevronRight strokeWidth={2.4} aria-hidden="true" />
            )}
          </Link>
        )}
      </Button>
    </li>
  );
}
