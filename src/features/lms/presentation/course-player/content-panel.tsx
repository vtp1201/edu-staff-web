"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/shared/utils";
import type {
  TimelineItemVm,
  WeekVm,
} from "../course-timeline/course-timeline.i-vm";
import { ItemTypeChip } from "../shared/item-type-chip";
import { useWeekLabel } from "../shared/use-week-label";

const TYPE_LABEL_KEY = {
  LESSON: "lesson",
  ASSIGNMENT: "assignment",
  DOCUMENT: "document",
  EXAM: "exam",
} as const satisfies Record<TimelineItemVm["itemType"], string>;

export interface ContentPanelProps {
  weeks: WeekVm[];
  /** `/…/courses/<id>/items` — each row appends its own id. */
  itemHrefBase: string;
  activeItemId: string;
  /** 1-based position of the active item in the flat list, for "3/12". */
  activeIndex: number;
  totalItems: number;
  prevHref: string | null;
  nextHref: string | null;
}

/**
 * "Nội dung khoá học" — the course's other items, as NAVIGATION.
 *
 * Every row is a real `<Link>`: opening an item changes the URL and re-renders
 * the page server-side (State & Data Flow §6). There is no client "currently
 * viewing" state, so the breadcrumb, header and body can never disagree with
 * the address bar.
 *
 * The only local state is which week groups are collapsed — intentionally
 * ephemeral (it resets on navigation) because it carries no meaning worth
 * putting in the URL.
 *
 * NOTE — no "✓ Đã nộp" per row: `CourseItem` carries no per-student submission
 * flag on the wire (confirmed US-E24.3/E24.5), and faking it, or firing one
 * submission read per assignment, would be worse than omitting it. The active
 * assignment's own state is shown in its body instead.
 */
export function ContentPanel({
  weeks,
  itemHrefBase,
  activeItemId,
  activeIndex,
  totalItems,
  prevHref,
  nextHref,
}: ContentPanelProps) {
  const t = useTranslations("courses.player");
  const tTimeline = useTranslations("courses.timeline");
  const format = useFormatter();
  const weekLabel = useWeekLabel();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  function toggle(key: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  return (
    <aside className="flex flex-col overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-border border-b px-4 py-3">
        <h2 className="font-extrabold text-foreground text-[13px]">
          {t("sidebar.title")}
        </h2>
        <span className="font-bold text-[11px] text-muted-foreground tabular-nums">
          {t("sidebar.counter", { index: activeIndex, total: totalItems })}
        </span>
      </div>

      <nav
        aria-label={t("sidebar.title")}
        className="max-h-[520px] overflow-y-auto lg:max-h-[520px]"
      >
        {weeks.map((week, weekIndex) => {
          const isCollapsed = collapsed.has(week.key);
          const panelId = `cp-week-${week.key}`;
          return (
            <div
              key={week.key}
              className={cn(weekIndex > 0 && "border-border border-t")}
            >
              <button
                type="button"
                aria-expanded={!isCollapsed}
                aria-controls={panelId}
                onClick={() => toggle(week.key)}
                className="flex min-h-11 w-full items-center gap-2 bg-edu-bg px-3.5 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {isCollapsed ? (
                  <ChevronRight
                    className="size-3 shrink-0 text-muted-foreground"
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    className="size-3 shrink-0 text-muted-foreground"
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1 truncate font-bold text-foreground text-xs">
                  {weekLabel(week)}
                </span>
                <span className="font-bold text-[10.5px] text-muted-foreground tabular-nums">
                  {t("sidebar.itemCount", { count: week.items.length })}
                </span>
              </button>

              <ul id={panelId} hidden={isCollapsed}>
                {week.items.map((item) => (
                  <li key={item.id}>
                    <ItemRow
                      item={item}
                      href={`${itemHrefBase}/${item.id}`}
                      active={item.id === activeItemId}
                      typeLabel={tTimeline(
                        `itemType.${TYPE_LABEL_KEY[item.itemType]}`,
                      )}
                      stateLabel={
                        item.locked
                          ? item.opensAt === null
                            ? tTimeline("itemState.upcoming")
                            : t("sidebar.opensAt", {
                                date: format.dateTime(new Date(item.opensAt), {
                                  day: "2-digit",
                                  month: "2-digit",
                                }),
                              })
                          : item.state === "CLOSED"
                            ? t("sidebar.closed")
                            : null
                      }
                      currentLabel={t("sidebar.current")}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="flex gap-2 border-border border-t bg-edu-bg p-3">
        <NavLink
          href={prevHref}
          label={t("sidebar.prev")}
          icon="prev"
          className="flex-1"
        />
        <NavLink
          href={nextHref}
          label={t("sidebar.next")}
          icon="next"
          className="flex-[1.4]"
          primary
        />
      </div>
    </aside>
  );
}

interface ItemRowProps {
  item: TimelineItemVm;
  href: string;
  active: boolean;
  typeLabel: string;
  /** "Đã đóng" / "Mở dd/MM" — null when the row's state needs no extra word. */
  stateLabel: string | null;
  currentLabel: string;
}

/**
 * One navigable row. A locked (unreleased) item stays a link on purpose: its
 * page states WHEN it opens, which is exactly what a student clicking it wants
 * to know — unlike the timeline, where the same click would have expanded an
 * empty body.
 *
 * "Currently viewing" is carried by `aria-current` for assistive tech AND by a
 * visible left accent + bold title + sr-only word for everyone else — never by
 * colour alone.
 */
function ItemRow({
  item,
  href,
  active,
  typeLabel,
  stateLabel,
  currentLabel,
}: ItemRowProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        // `ring-inset`: the panel clips its corners and rows run edge to edge.
        "flex min-h-11 items-start gap-2.5 border-l-[3px] py-2.5 pr-3.5 pl-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        active
          ? "border-l-primary bg-primary/12"
          : "border-l-transparent hover:bg-muted/60",
      )}
    >
      <ItemTypeChip
        itemType={item.itemType}
        locked={item.locked}
        className="mt-0.5 size-[26px] rounded-[7px]"
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-xs leading-snug",
            active
              ? "font-bold text-edu-primary-accessible"
              : item.state === "CLOSED"
                ? "font-semibold text-edu-text-secondary"
                : "font-semibold text-foreground",
          )}
        >
          {item.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span className="font-bold">{typeLabel}</span>
          {stateLabel !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{stateLabel}</span>
            </>
          )}
          {active && <span className="sr-only">{currentLabel}</span>}
        </span>
      </span>
      {active && (
        <Play
          className="mt-1 size-2.5 shrink-0 text-edu-primary-accessible"
          strokeWidth={2.4}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

interface NavLinkProps {
  href: string | null;
  label: string;
  icon: "prev" | "next";
  className?: string;
  primary?: boolean;
}

/**
 * Prev / "Mục tiếp theo". At either end the control still renders — as a
 * non-focusable `aria-disabled` span, not an `<a>` without an `href` (which
 * would be an unlabelled, unreachable link) and not a hidden control (which
 * would make the footer jump).
 */
function NavLink({ href, label, icon, className, primary }: NavLinkProps) {
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  const content = (
    <>
      {icon === "prev" && (
        <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
      )}
      {label}
      {icon === "next" && (
        <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
      )}
    </>
  );
  const base =
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 font-bold text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

  if (href === null) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          base,
          "cursor-not-allowed border border-border bg-muted text-muted-foreground",
          className,
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        base,
        primary
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-edu-text-secondary",
        className,
      )}
    >
      {content}
    </Link>
  );
}
