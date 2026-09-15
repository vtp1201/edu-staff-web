"use client";

import { AlertTriangle, Info, Printer, Unlock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ChildSwitcher } from "@/components/shared/child-switcher";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  type AcademicYear,
  type TermRecord,
  UNRESOLVED_YEAR_ID,
} from "../../domain/entities/academic-record.entity";
import type {
  AcademicRecordScreenVM,
  AcademicRecordViewerRole,
} from "./academic-record-screen.i-vm";
import { emptyStateCopyKey, roleBadgeKey } from "./academic-record-screen.i-vm";
import { AcademicRecordTable } from "./academic-record-table";
import { SealStatusBadge } from "./seal-status-badge";
import { YearTimeline } from "./year-timeline";

export interface AcademicRecordScreenProps {
  vm: AcademicRecordScreenVM;
  onYearChange?: (yearId: string) => void;
  onRetry?: () => void;
  /**
   * PARENT-only, supplied by the container. A prop rather than a VM field, like
   * its `onYearChange`/`onRetry` siblings: the VM is server-built data, the
   * callbacks are router wiring the stories deliberately omit.
   */
  onSwitchChild?: (childId: string) => void;
  isSwitchingChild?: boolean;
}

type ChildPanelProps = {
  readonly role: "tabpanel";
  readonly id: string;
  readonly "aria-labelledby": string;
};

/**
 * Wraps a branch's body in the per-CHILD tabpanel when — and only when — a
 * child tab is actually selected.
 *
 * Module-level ON PURPOSE (US-E24.16 review): declared inside the screen it
 * would be a NEW component type on every render, so React would unmount and
 * remount the whole record subtree on each `isSwitchingChild` edge, throwing
 * away focus and scroll for nothing.
 *
 * For every non-parent viewer `panelProps` is `null` and the body renders as a
 * bare fragment — their DOM is exactly what it was before this story. The
 * wrapper is not a `display:contents` shim either: that would strip the
 * record's `space-y-6` rhythm (the utility only reaches DIRECT children).
 */
function ChildTabPanel({
  panelProps,
  busy,
  children,
}: {
  panelProps: ChildPanelProps | null;
  busy: boolean;
  children: React.ReactNode;
}) {
  if (!panelProps) return <>{children}</>;
  return (
    <div {...panelProps} aria-busy={busy || undefined} className="space-y-6">
      {children}
    </div>
  );
}

const ROLE_TONE: Record<
  AcademicRecordViewerRole,
  "primary" | "success" | "warning" | "purple"
> = {
  teacher: "primary",
  admin: "success",
  student: "warning",
  parent: "purple",
};

/**
 * Record-level header: viewer role + overall seal state.
 *
 * The student identity block (name / mã HS / ngày sinh / lớp hiện tại) is GONE
 * as of US-E18.54: `core`'s academic-record contract carries no identity
 * fields, and no directory read a STUDENT or PARENT may call backfills them.
 * Fabricating or echoing a raw memberId here is worse than omitting the block.
 */
function RecordHeader({ vm }: { vm: AcademicRecordScreenVM }) {
  const t = useTranslations("academicRecord");
  const tRole = useTranslations("academicRecord.roleBadge");
  const { record, role } = vm;
  if (!record) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">{t("student.summary")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={ROLE_TONE[role]}>
            {tRole(roleBadgeKey(role) as never)}
          </StatusBadge>
          <SealStatusBadge sealed={record.sealed} />
        </div>
      </div>
    </div>
  );
}

/**
 * `termId` is a FREE-FORM clustering key in `core` (`"HK1"`, `"HK2"`, or a
 * uuid). Prefer the calendar's own name (resolved in the repository); then the
 * two conventional labels; and only fall back to the key itself when it is not
 * a uuid — printing a raw uuid as a section heading is never useful.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useTermTitle(term: Pick<TermRecord, "termId" | "termName">): string {
  const t = useTranslations("academicRecord.termSection");
  if (term.termName?.trim()) return term.termName;
  if (term.termId === "HK1") return t("term1");
  if (term.termId === "HK2") return t("term2");
  return UUID.test(term.termId) ? t("termUnknown") : term.termId;
}

function TermSection({ term }: { term: TermRecord }) {
  const t = useTranslations("academicRecord");
  const format = useFormatter();
  const title = useTermTitle(term);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-base text-foreground">{title}</h3>
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          {/* `sealedBy` is a memberId on the wire with no name lookup a
              student/parent may call — show WHEN, never a raw uuid. */}
          {term.sealedAt && term.status !== "PENDING" && (
            <span className="tabular-nums">
              {t("termSection.sealedOn")}:{" "}
              {format.dateTime(new Date(term.sealedAt), {
                dateStyle: "short",
              })}
            </span>
          )}
          <SealStatusBadge sealed={term.status === "SEALED"} />
        </div>
      </div>

      {term.status === "PENDING" ? (
        <div className="rounded-lg border border-border border-dashed bg-muted/30 p-6 text-center">
          <p className="font-semibold text-foreground">{t("pending.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pending.description")}
          </p>
        </div>
      ) : (
        <>
          {term.status === "UNSEALED" && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-edu-warning/40 bg-edu-warning/10 p-3 text-sm"
            >
              <Unlock
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-edu-warning-foreground"
              />
              <div className="text-edu-warning-foreground">
                <p className="font-semibold">
                  {t("termSection.unsealedBanner")}
                </p>
                {term.unsealReason && (
                  <p className="mt-0.5">{term.unsealReason}</p>
                )}
              </div>
            </div>
          )}
          <AcademicRecordTable termRecord={term} />
        </>
      )}
    </section>
  );
}

/** Multi-role read-only academic-record viewer. Year switching is driven by the
 * container (URL searchParams → RSC re-fetch); this screen is router-agnostic. */
export function AcademicRecordScreen({
  vm,
  onYearChange,
  onRetry,
  onSwitchChild,
  isSwitchingChild = false,
}: AcademicRecordScreenProps) {
  const t = useTranslations("academicRecord");
  const { record, error, selectedYearId } = vm;

  const title = (
    <div className="space-y-1">
      <h1 className="font-extrabold text-2xl text-foreground">
        {t("pageTitle")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("pageSubtitle")}</p>
    </div>
  );

  /**
   * Rendered in ALL THREE branches below (US-E24.16). The `forbidden` a foreign
   * `studentId` earns is precisely the state where a parent most needs a way
   * out — hiding the selector there would strand them on a dead route with only
   * the browser back button. `undefined` for every non-parent role, and for a
   * parent with one child or a failed roster read, so those renders are
   * unchanged.
   */
  const switcher = vm.childSwitcher ? (
    <ChildSwitcher
      childList={vm.childSwitcher.childList}
      activeChildId={vm.childSwitcher.activeChildId}
      onSwitch={(childId) => onSwitchChild?.(childId)}
      isLoading={isSwitchingChild}
    />
  ) : null;

  /**
   * The tablist/tabpanel pairing the shared `ChildSwitcher` expects from its
   * consumer (same contract `ParentAttendanceScreen` and `GradeBookScreen`
   * satisfy — the component emits `aria-controls`, the screen owns the panel).
   *
   * Emitted only when a tab is actually selected: on a foreign `studentId` no
   * tab is selected, and ARIA has no panel to show for a tablist with no
   * selection — labelling the error region with a `tab-*` id that does not
   * exist would be worse than omitting the pairing.
   */
  const activeChildTabId = vm.childSwitcher?.childList.some(
    (c) => c.childId === vm.childSwitcher?.activeChildId,
  )
    ? vm.childSwitcher.activeChildId
    : null;
  const childPanelProps: ChildPanelProps | null = activeChildTabId
    ? {
        role: "tabpanel",
        id: `tabpanel-${activeChildTabId}`,
        "aria-labelledby": `tab-${activeChildTabId}`,
      }
    : null;

  if (error) {
    return (
      <div className="space-y-6">
        {title}
        {switcher}
        {/* `role="alert"` cannot double as the tabpanel, so when a child tab IS
            selected the pairing is carried by a wrapping region — otherwise the
            active tab's `aria-controls` would dangle (US-E24.16 review). */}
        <ChildTabPanel panelProps={childPanelProps} busy={isSwitchingChild}>
          <div
            role="alert"
            aria-busy={isSwitchingChild || undefined}
            className="flex flex-col items-center gap-3 rounded-xl border border-edu-error/30 bg-edu-error/10 p-8 text-center"
          >
            <AlertTriangle aria-hidden className="size-6 text-edu-error-text" />
            <div>
              <p className="font-bold text-edu-error-text">
                {t("error.title")}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {t(`error.${error}`)}
              </p>
            </div>
            {onRetry && (
              <Button type="button" variant="outline" onClick={onRetry}>
                {t("error.retry")}
              </Button>
            )}
          </div>
        </ChildTabPanel>
      </div>
    );
  }

  if (!record || record.years.length === 0) {
    // Role-aware copy: a TEACHER's read is homeroom-scoped, so "there is
    // nothing here" would be a false claim for them (US-E18.57).
    const emptyKey = emptyStateCopyKey(vm.role);
    return (
      <div className="space-y-6">
        {title}
        {switcher}
        <div
          {...(childPanelProps ?? {})}
          aria-busy={isSwitchingChild || undefined}
          className="flex flex-col items-center gap-2 rounded-xl border border-border border-dashed bg-card p-10 text-center"
        >
          <p className="font-bold text-foreground">{t(`${emptyKey}.title`)}</p>
          <p className="text-sm text-muted-foreground">
            {t(`${emptyKey}.description`)}
          </p>
        </div>
      </div>
    );
  }

  const activeYearId = selectedYearId ?? record.years[0].yearId;
  const activeYear: AcademicYear =
    record.years.find((y) => y.yearId === activeYearId) ?? record.years[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {title}
        <Button
          type="button"
          variant="outline"
          aria-disabled="true"
          title={t("printButtonComingSoon")}
          onClick={(e) => e.preventDefault()}
        >
          <Printer aria-hidden className="size-4" />
          {t("printButton")}
        </Button>
      </div>

      {switcher}

      <ChildTabPanel panelProps={childPanelProps} busy={isSwitchingChild}>
        <RecordHeader vm={vm} />

        <YearTimeline
          years={record.years}
          activeYearId={activeYear.yearId}
          onChange={(id) => onYearChange?.(id)}
        />

        {activeYear.yearId === UNRESOLVED_YEAR_ID && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm"
          >
            <Info
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <p className="text-muted-foreground">
              {t("unresolvedYear.description")}
            </p>
          </div>
        )}

        <div
          id={`tabpanel-${activeYear.yearId}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeYear.yearId}`}
          // The record region proper: while a child switch is in flight these
          // rows still belong to the PREVIOUS child, so they are announced as
          // stale. Deliberately not on an ancestor of the tablist — the selector
          // must stay live so the parent can change their mind mid-navigation.
          aria-busy={isSwitchingChild || undefined}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: ARIA APG tabpanel pattern — the panel is intentionally focusable so Tab from the tablist lands on its content (WAI-ARIA tabs design pattern).
          tabIndex={0}
          className="space-y-8"
        >
          {activeYear.terms.map((term) => (
            <TermSection key={`${term.classId}-${term.termId}`} term={term} />
          ))}
        </div>
      </ChildTabPanel>
    </div>
  );
}
