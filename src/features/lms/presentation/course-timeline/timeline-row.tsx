"use client";

import {
  CalendarClock,
  ChevronRight,
  Clock,
  GripVertical,
  MoveDown,
  MoveUp,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatItemWindow } from "@/features/lms/domain/use-cases/format-item-window";
import { cn } from "@/shared/utils";
import { ItemStatePill } from "../shared/item-state-pill";
import { ItemTypeChip } from "../shared/item-type-chip";
import { EditWindowRow } from "../teacher-course-tab/edit-window-row";
import type {
  ItemWindowInput,
  TimelineItemVm,
  TimelineMutationResult,
} from "./course-timeline.i-vm";

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
  /** Where an openable row navigates: the course player for THIS item. */
  itemHref: string;
  /** Drops the rail's trailing segment on the very last row of the timeline. */
  isLast: boolean;
  /**
   * NEW (US-E24.10), default `true`. `false` is the READ-ONLY shape: no link,
   * no affordances — a GVCN reading a colleague's course has nowhere to go and
   * nothing to change. Student and teacher rows are unaffected by the default.
   */
  interactive?: boolean;
  /** Teacher mode only. All of the following are `undefined` otherwise, and
   *  the row renders exactly the student markup. */
  editable?: boolean;
  /** True while this row is the drop target of an in-flight drag. */
  isDropTarget?: boolean;
  onDragStartItem?: () => void;
  onDragEnterItem?: () => void;
  onDragEndItem?: () => void;
  onDropItem?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSaveWindow?: (input: ItemWindowInput) => Promise<TimelineMutationResult>;
  /** DOCUMENT rows only — LESSON/ASSIGNMENT/EXAM tiles die with the entity
   *  they point at, so no delete affordance mounts for them at all. */
  onDelete?: () => void;
}

/**
 * One timeline row: rail node + card (US-E24.3).
 *
 * Interaction contract:
 * - OPEN / CLOSED → a real `<Link>` to the course player (US-E24.5 replaced
 *   the temporary inline expand); CLOSED is deliberately still openable (a
 *   student re-reads closed material to revise).
 * - `locked` (an unreleased item — for a student read only ever an EXAM, D7) →
 *   a non-interactive `aria-disabled` block, out of the tab order, that states
 *   in VISIBLE text when it opens.
 *
 * That visible line replaces the design's hover `title` tooltip on purpose:
 * `title` is unreachable on touch and unreliable on keyboard focus, and this is
 * the only place the opening time is communicated (accessibility.md).
 *
 * In student and read-only modes the row is ONE focus target with ONE
 * accessible name — nothing interactive is nested inside it. TEACHER mode adds
 * a sibling control cluster NEXT TO the link (never inside it): reorder,
 * "Sửa ngày", and delete for a DOCUMENT.
 */
export function TimelineRow({
  item,
  itemHref,
  isLast,
  interactive = true,
  editable = false,
  isDropTarget = false,
  onDragStartItem,
  onDragEnterItem,
  onDragEndItem,
  onDropItem,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onSaveWindow,
  onDelete,
}: TimelineRowProps) {
  const t = useTranslations("courses");
  const tt = useTranslations("courses.teacher");
  const format = useFormatter();
  const examHintId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // An exam's window belongs to core's exam schedule, so the control is
  // disabled in EVERY mode — it is a BE invariant, not a per-role choice.
  const windowLocked = item.itemType === "EXAM";

  async function saveWindow(input: ItemWindowInput) {
    if (!onSaveWindow) return;
    setIsSaving(true);
    try {
      const res = await onSaveWindow(input);
      if (res.ok) {
        setIsEditing(false);
        setSaveError(null);
      } else {
        setSaveError(t(`errors.${res.errorKey}`));
      }
    } finally {
      setIsSaving(false);
    }
  }

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

  const teacherControls = editable ? (
    <div className="flex flex-wrap items-center gap-1.5 border-border border-t px-2 py-1.5">
      <GripVertical
        className="size-4 shrink-0 cursor-grab text-muted-foreground"
        strokeWidth={2}
        aria-hidden="true"
      />
      {/* The keyboard path to reordering. NOT optional: HTML5 drag-and-drop is
          mouse/touch only, so without these buttons the whole feature would be
          unreachable by keyboard (accessibility.md). Both call the exact same
          reorder mutation a drop does. */}
      {/* `aria-disabled` + a no-op guard, NEVER the native `disabled` attribute:
          the row that just moved reaches the edge WHILE its own button holds
          focus, and a natively disabled element is dropped from the tab order
          instantly — the browser then throws focus back to `<body>` with no
          warning (WCAG 2.4.3). Keeping the button focusable costs nothing and
          keeps the keyboard user exactly where they were. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
        aria-disabled={!canMoveUp}
        aria-label={tt("reorder.up", { title: item.title })}
        onClick={() => {
          if (!canMoveUp) return;
          onMoveUp?.();
        }}
      >
        <MoveUp className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
        aria-disabled={!canMoveDown}
        aria-label={tt("reorder.down", { title: item.title })}
        onClick={() => {
          if (!canMoveDown) return;
          onMoveDown?.();
        }}
      >
        <MoveDown className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      </Button>

      <span className="flex-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 font-bold text-[12px]"
        disabled={windowLocked}
        aria-expanded={windowLocked ? undefined : isEditing}
        aria-describedby={windowLocked ? examHintId : undefined}
        onClick={() => setIsEditing((open) => !open)}
      >
        <CalendarClock
          className="size-3.5"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        {tt("editDates.label")}
      </Button>

      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 text-edu-error-text"
          aria-label={tt("delete.label", { title: item.title })}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        </Button>
      )}
    </div>
  ) : null;

  return (
    // Drag is an ENHANCEMENT here; the reorder buttons above are the
    // accessible, keyboard-complete path.
    <li
      className="flex gap-0"
      draggable={editable || undefined}
      onDragStart={editable ? onDragStartItem : undefined}
      onDragEnter={editable ? onDragEnterItem : undefined}
      onDragEnd={editable ? onDragEndItem : undefined}
      onDragOver={editable ? (e) => e.preventDefault() : undefined}
      onDrop={
        editable
          ? (e) => {
              e.preventDefault();
              onDropItem?.();
            }
          : undefined
      }
    >
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
            "rounded-[10px] border border-border bg-card",
            // Drop feedback is a ring PLUS the row physically moving on drop —
            // never colour alone.
            isDropTarget && "ring-2 ring-ring",
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
          ) : interactive ? (
            <Link
              href={itemHref}
              // `ring-inset`: the card clips its corners and the link fills it
              // edge to edge, so an outward ring would be cut off.
              className="flex w-full flex-wrap items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {head}
              <ChevronRight
                className="size-3 shrink-0 text-muted-foreground"
                strokeWidth={2.4}
                aria-hidden="true"
              />
            </Link>
          ) : (
            // Staff rows are NOT links: there is no teacher-side player route,
            // and pointing them at the student one would be a dead end. A
            // read-only row is therefore plain content, and a teacher row is
            // plain content plus the control cluster below.
            <div className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5">
              {head}
            </div>
          )}

          {windowLocked && editable && (
            // Static text, not a hover `title`: a tooltip is unreachable on
            // touch and unreliable on keyboard focus, and this is the only
            // place the refusal is explained.
            <p
              id={examHintId}
              className="px-3.5 pb-2 text-[11px] text-muted-foreground"
            >
              {t("errors.exam-window-not-editable")}
            </p>
          )}

          {teacherControls}

          {editable && isEditing && !windowLocked && (
            <EditWindowRow
              startAt={item.startAt}
              dueAt={item.dueAt}
              isSaving={isSaving}
              serverError={saveError}
              onSave={(input) => void saveWindow(input)}
              onCancel={() => {
                setIsEditing(false);
                setSaveError(null);
              }}
            />
          )}
        </div>
      </div>
    </li>
  );
}
