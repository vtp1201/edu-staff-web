"use client";

import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { formatItemWindow } from "@/features/lms/domain/use-cases/format-item-window";
import { cn } from "@/shared/utils";
import { ItemStatePill } from "../shared/item-state-pill";
import { ItemTypeChip } from "../shared/item-type-chip";
import type {
  CourseTimelineActions,
  TimelineItemVm,
} from "./course-timeline.i-vm";
import { ItemDetail } from "./item-detail";

/** Rail node colour by BE state (design-spec `…timeline.rail`). Decorative —
 *  the pill next to it carries the same information as text.
 *
 *  Deliberately NOT merged with `STATE_DOT_CLASS` in `item-state-pill.tsx`,
 *  even though OPEN/UPCOMING_HIDDEN agree: CLOSED differs on purpose. The rail
 *  dot sits ON the rail line (spec colour `#C3CBD9` = `--border`) and must read
 *  as part of that spent line; the pill dot sits inside a muted badge on the
 *  card, where `bg-border` would be all but invisible, so it takes the darker
 *  `bg-edu-text-secondary`. Two surfaces, two legibility constraints — one
 *  shared map would break whichever surface lost. */
const STATE_DOT: Record<TimelineItemVm["state"], string> = {
  OPEN: "bg-edu-success-text",
  UPCOMING_HIDDEN: "bg-edu-info",
  CLOSED: "bg-border",
};

const TYPE_LABEL_KEY = {
  LESSON: "lesson",
  ASSIGNMENT: "assignment",
  DOCUMENT: "document",
  EXAM: "exam",
} as const satisfies Record<TimelineItemVm["itemType"], string>;

export interface TimelineRowProps {
  item: TimelineItemVm;
  expanded: boolean;
  onToggleExpand: (itemId: string) => void;
  getLesson: CourseTimelineActions["getLesson"];
  assignmentsHref: string;
  /** Drops the rail's trailing segment on the very last row of the timeline. */
  isLast: boolean;
}

/**
 * One timeline row: rail node + card (US-E24.3).
 *
 * Interaction contract:
 * - OPEN / CLOSED → a real `<button aria-expanded>`; CLOSED is deliberately
 *   still openable (a student re-reads closed material to revise).
 * - `locked` (an unreleased item — for a student read only ever an EXAM, D7) →
 *   a non-interactive `aria-disabled` block, out of the tab order, that states
 *   in VISIBLE text when it opens.
 *
 * That visible line replaces the design's hover `title` tooltip on purpose:
 * `title` is unreachable on touch and unreliable on keyboard focus, and this is
 * the only place the opening time is communicated (accessibility.md).
 *
 * The expandable detail is a SIBLING of the button, never a child: it contains
 * its own links, and interactive elements must not nest.
 */
export function TimelineRow({
  item,
  expanded,
  onToggleExpand,
  getLesson,
  assignmentsHref,
  isLast,
}: TimelineRowProps) {
  const t = useTranslations("courses");
  const format = useFormatter();

  const itemWindow = formatItemWindow(item, (date) =>
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

  const Chevron = expanded ? ChevronDown : ChevronRight;
  /** Ties `aria-expanded` to the thing it expands (WCAG 4.1.2 / A11Y-001). */
  const panelId = `ci-panel-${item.id}`;

  const head = (
    <>
      <ItemTypeChip itemType={item.itemType} />
      <span className="min-w-0 flex-1 basis-40">
        <span
          className={cn(
            "block font-bold text-[13px]",
            item.state === "CLOSED"
              ? "text-muted-foreground"
              : "text-foreground",
          )}
        >
          {item.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {/* Type label stays muted-foreground rather than its tone colour: at
              11px it is small text (needs ≥4.5:1) and the tinted chip already
              carries the colour identity. */}
          <span className="font-bold">
            {t(`timeline.itemType.${TYPE_LABEL_KEY[item.itemType]}`)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{windowText}</span>
        </span>
      </span>
      <ItemStatePill state={item.state} examLocked={item.locked} />
    </>
  );

  return (
    <li className="flex gap-0">
      {/* Decorative rail — reading order is carried by the DOM, not the line. */}
      <span
        aria-hidden="true"
        className="flex w-[34px] shrink-0 flex-col items-center"
      >
        <span className="h-[18px] w-0.5 shrink-0 bg-border" />
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full ring-2 ring-card",
            STATE_DOT[item.state],
          )}
        />
        {!isLast && <span className="w-0.5 flex-1 bg-border" />}
      </span>

      <div className="min-w-0 flex-1 py-1.5">
        <div
          className={cn(
            "rounded-[10px] border",
            expanded ? "border-primary/50 bg-muted" : "border-border bg-card",
          )}
        >
          {item.locked ? (
            <div
              aria-disabled="true"
              className="flex flex-col gap-2 px-3.5 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2.5">{head}</div>
              <p className="flex items-center gap-1.5 rounded-lg bg-edu-info-light px-2.5 py-1.5 font-semibold text-[11px] text-foreground">
                <Clock
                  className="size-3 shrink-0"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                {item.opensAt
                  ? t("timeline.opensAt", {
                      date: format.dateTime(new Date(item.opensAt), {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    })
                  : t("timeline.opensAtUnknown")}
              </p>
            </div>
          ) : (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => onToggleExpand(item.id)}
              // `ring-inset`: the card clips its corners and the button fills
              // it edge to edge, so an outward ring would be cut off.
              // `hover:bg-muted/60` is a no-op once expanded (the card is
              // already `bg-muted`, and muted-over-muted blends to itself), so
              // hover only ever signals "this collapsed row is clickable".
              className="flex w-full flex-wrap items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {head}
              <Chevron
                className="size-3 shrink-0 text-muted-foreground"
                strokeWidth={2.4}
                aria-hidden="true"
              />
            </button>
          )}

          {expanded && !item.locked && (
            // TEMP (US-E24.3): inline expand until US-E24.5 ships the real
            // /items/[itemId] route — delete this block with `item-detail.tsx`.
            <div id={panelId} className="border-border border-t px-3.5 py-3">
              <ItemDetail
                item={item}
                getLesson={getLesson}
                assignmentsHref={assignmentsHref}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
