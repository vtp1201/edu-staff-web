"use client";

import { AlertTriangle, Info, Printer, Unlock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
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
import { roleBadgeKey } from "./academic-record-screen.i-vm";
import { AcademicRecordTable } from "./academic-record-table";
import { SealStatusBadge } from "./seal-status-badge";
import { YearTimeline } from "./year-timeline";

export interface AcademicRecordScreenProps {
  vm: AcademicRecordScreenVM;
  onYearChange?: (yearId: string) => void;
  onRetry?: () => void;
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
 * uuid). The two conventional labels get their i18n copy; anything else renders
 * verbatim — a term this app has never seen is not a reason to hide it.
 */
function useTermTitle(termId: string): string {
  const t = useTranslations("academicRecord.termSection");
  if (termId === "HK1") return t("term1");
  if (termId === "HK2") return t("term2");
  return termId;
}

function TermSection({ term }: { term: TermRecord }) {
  const t = useTranslations("academicRecord");
  const format = useFormatter();
  const title = useTermTitle(term.termId);

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

  if (error) {
    return (
      <div className="space-y-6">
        {title}
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-edu-error/30 bg-edu-error/10 p-8 text-center"
        >
          <AlertTriangle aria-hidden className="size-6 text-edu-error-text" />
          <div>
            <p className="font-bold text-edu-error-text">{t("error.title")}</p>
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
      </div>
    );
  }

  if (!record || record.years.length === 0) {
    return (
      <div className="space-y-6">
        {title}
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border border-dashed bg-card p-10 text-center">
          <p className="font-bold text-foreground">{t("empty.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("empty.description")}
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
        // biome-ignore lint/a11y/noNoninteractiveTabindex: ARIA APG tabpanel pattern — the panel is intentionally focusable so Tab from the tablist lands on its content (WAI-ARIA tabs design pattern).
        tabIndex={0}
        className="space-y-8"
      >
        {activeYear.terms.map((term) => (
          <TermSection key={`${term.classId}-${term.termId}`} term={term} />
        ))}
      </div>
    </div>
  );
}
