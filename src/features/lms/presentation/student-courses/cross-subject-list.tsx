import { Clipboard, FileText, Info } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/shared/utils";
import type {
  CrossSubjectGroupsVm,
  CrossSubjectSubTab,
} from "./cross-subject.i-vm";
import { CrossSubjectRow } from "./cross-subject-row";

/** The cross-subject list only ever filters these two types. */
export type CrossSubjectView = "assignment" | "exam";

/** "Sắp mở" exists for EXAM only: a student read never returns an unreleased
 *  item of any other type (D7 — design-spec `visibilityRule`), so an assignment
 *  tab there would always be an empty group pretending to be a filter. */
function subTabsFor(view: CrossSubjectView): CrossSubjectSubTab[] {
  return view === "exam" ? ["open", "upcoming", "closed"] : ["open", "closed"];
}

function tabId(sub: CrossSubjectSubTab): string {
  return `cross-subject-tab-${sub}`;
}
const PANEL_ID = "cross-subject-panel";

export interface CrossSubjectListProps {
  view: CrossSubjectView;
  sub: CrossSubjectSubTab;
  groups: CrossSubjectGroupsVm;
  /** Route-owned builder — only the route knows locale/tenant. */
  hrefFor: (sub: CrossSubjectSubTab) => string;
}

/**
 * Every assignment / exam of every course of the class, in one list
 * (US-E24.4, design-spec `crossSubjectList`).
 *
 * Underline tabs are real anchors to `?sub=`, so — exactly like the view pills
 * — the URL is the state and only ONE group is ever in the DOM (the server
 * renders the active one). `aria-controls` therefore points at the single
 * panel, and only from the selected tab: pointing an unselected tab at a panel
 * that describes a different group would be a false reference.
 *
 * Each count is spelled out in an `aria-label` ("Đang mở, 4 mục"): the bare
 * numeral in the pill is announced as a stray digit next to the tab name.
 */
export function CrossSubjectList({
  view,
  sub,
  groups,
  hrefFor,
}: CrossSubjectListProps) {
  const t = useTranslations("courses.cross");
  const rows = groups[sub];

  return (
    <div className="flex flex-col gap-3.5">
      <p className="flex items-start gap-2 rounded-[9px] bg-edu-info-light px-3.5 py-2.5 font-semibold text-[12px] text-foreground">
        <Info
          className="mt-px size-3.5 shrink-0"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        {t(`banner.${view}`)}
      </p>

      <div
        role="tablist"
        aria-label={t("subTabLabel")}
        className="flex flex-wrap gap-1 border-border border-b"
      >
        {subTabsFor(view).map((id) => {
          const active = id === sub;
          const count = groups[id].length;
          return (
            <Link
              key={id}
              id={tabId(id)}
              href={hrefFor(id)}
              role="tab"
              aria-selected={active}
              aria-controls={active ? PANEL_ID : undefined}
              // The count is the tab's most useful information and a bare
              // numeral is announced as a stray digit, so the whole phrase
              // ("Đang mở, 4 mục") IS the tab's accessible name and the pill
              // itself is decoration.
              aria-label={t("countAria", { label: t(`subTab.${id}`), count })}
              className={cn(
                "-mb-px inline-flex min-h-[44px] items-center gap-1.5 border-b-2 px-3.5 py-2.5 font-semibold text-[12.5px] outline-none motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary font-bold text-edu-primary-accessible"
                  : "border-transparent text-edu-text-secondary hover:text-foreground",
              )}
            >
              {t(`subTab.${id}`)}
              <span
                aria-hidden="true"
                className={cn(
                  "min-w-4 rounded-full px-1.5 py-px text-center font-extrabold text-[10.5px] tabular-nums",
                  // 10.5px extra-bold is NOT "large text", so the tint needs
                  // a 4.5:1 foreground: #4468E0 on #ECF2FF is only 4.35:1,
                  // `text-foreground` is 11.5:1 (the StatusBadge pairing).
                  active
                    ? "bg-edu-primary-light text-foreground"
                    : "bg-muted text-edu-text-secondary",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(sub)}>
        {rows.length === 0 ? (
          <div className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
            <EmptyState
              icon={view === "assignment" ? Clipboard : FileText}
              title={t("empty")}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <CrossSubjectRow key={row.key} row={row} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
