"use client";

import { AlertTriangle, Printer, Unlock } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type {
  AcademicYear,
  TermRecord,
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

function StudentHeader({ vm }: { vm: AcademicRecordScreenVM }) {
  const t = useTranslations("academicRecord");
  const tRole = useTranslations("academicRecord.roleBadge");
  const { record, role } = vm;
  if (!record) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-extrabold text-foreground text-lg">
            {record.studentName}
          </h2>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <dt className="font-semibold">{t("student.code")}:</dt>
              <dd className="text-foreground">{record.studentCode}</dd>
            </div>
            {record.dateOfBirth && (
              <div className="flex gap-1">
                <dt className="font-semibold">{t("student.dob")}:</dt>
                <dd className="text-foreground">{record.dateOfBirth}</dd>
              </div>
            )}
            {record.currentClassId && (
              <div className="flex gap-1">
                <dt className="font-semibold">{t("student.currentClass")}:</dt>
                <dd className="text-foreground">{record.currentClassId}</dd>
              </div>
            )}
            {record.currentSchoolYear && (
              <div className="flex gap-1">
                <dt className="font-semibold">{t("student.currentYear")}:</dt>
                <dd className="text-foreground">{record.currentSchoolYear}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge tone={ROLE_TONE[role]}>
            {tRole(roleBadgeKey(role) as never)}
          </StatusBadge>
          <SealStatusBadge sealed={record.sealed} />
        </div>
      </div>
    </div>
  );
}

function TermSection({ term }: { term: TermRecord }) {
  const t = useTranslations("academicRecord");
  const title =
    term.termId === "HK1" ? t("termSection.term1") : t("termSection.term2");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-foreground text-base">{title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {term.sealedBy && term.status !== "PENDING" && (
            <span>
              {t("termSection.signedBy")}: {term.sealedBy}
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
            <div className="flex items-start gap-2 rounded-lg border border-edu-warning/40 bg-edu-warning/10 p-3 text-sm">
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
        <Button type="button" variant="outline" disabled>
          <Printer aria-hidden className="size-4" />
          {t("printButton")}
        </Button>
      </div>

      <StudentHeader vm={vm} />

      <YearTimeline
        years={record.years}
        activeYearId={activeYear.yearId}
        onChange={(id) => onYearChange?.(id)}
      />

      <div className="space-y-8">
        {activeYear.terms.map((term) => (
          <TermSection key={term.termId} term={term} />
        ))}
      </div>
    </div>
  );
}
