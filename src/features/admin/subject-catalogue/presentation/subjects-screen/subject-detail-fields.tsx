"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type { SubjectDetailForm } from "./use-subject-detail-form";

export interface SubjectDetailFieldsProps {
  form: SubjectDetailForm;
  classOfferings: ClassSubject[];
  /**
   * The full-page route renders the offerings as a right-rail usage card
   * instead of this flat table, so it opts out (prop-variance instead of a
   * forked component — `.claude/rules/component-organization.md`).
   */
  showClassOfferings?: boolean;
  /**
   * Archived subjects are out of service and must not be editable — every input
   * renders `disabled` (design reference `design_src/edu/subject-detail.jsx`
   * `isArchived`). Defaults to `false` so the quick-edit Sheet is unaffected.
   */
  readOnly?: boolean;
}

/**
 * The subject master-editor body: basic info + locked curriculum standard
 * (+ the flat class-offerings table for the Sheet). Shared by
 * `subject-detail-sheet.tsx` and `subject-detail-screen.tsx` (US-E12.13).
 *
 * Must be rendered inside a `TooltipProvider` (both consumers already have one).
 */
export function SubjectDetailFields({
  form,
  classOfferings,
  showClassOfferings = true,
  readOnly = false,
}: SubjectDetailFieldsProps) {
  const t = useTranslations("subjectCatalogue.subjectDetail");
  const { values, setField, error } = form;

  const nameId = useId();
  const codeId = useId();
  const codeErrId = useId();
  const periodId = useId();
  const assessId = useId();
  const outcomeId = useId();
  const syllabusId = useId();
  const exerciseId = useId();
  const examId = useId();

  const codeInvalid = error !== null;

  return (
    <>
      {/* Basic info */}
      <section className="flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("basicInfoSection")}
        </h3>
        <div className="grid gap-2">
          <Label htmlFor={nameId}>{t("nameLabel")}</Label>
          <Input
            id={nameId}
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            maxLength={128}
            disabled={readOnly}
          />
          <p className="text-xs text-muted-foreground">{t("nameHint")}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={codeId}>
            {t("codeLabel")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("codeOptional")})
            </span>
          </Label>
          <Input
            id={codeId}
            value={values.code}
            onChange={(e) => setField("code", e.target.value)}
            maxLength={16}
            aria-invalid={codeInvalid}
            aria-describedby={codeInvalid ? codeErrId : undefined}
            disabled={readOnly}
          />
          <p className="text-xs text-muted-foreground">{t("codeHint")}</p>
          {codeInvalid && (
            <p
              id={codeErrId}
              role="alert"
              className="text-xs text-edu-error-text"
            >
              {error}
            </p>
          )}
        </div>
      </section>

      {/* Curriculum standard */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("curriculumSection")}
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-edu-info/15 px-2 py-0.5 text-xs font-semibold text-edu-text-primary">
            <Lock aria-hidden="true" className="size-3" />
            {t("lockedBadge")}
          </span>
        </div>
        <p className="rounded-[var(--edu-radius-btn)] bg-edu-info/10 p-3 text-xs text-edu-text-primary">
          {t("lockedBanner")}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={periodId} className="flex items-center gap-1">
              {t("fieldPeriodCount")}
              <LockHint label={t("lockedTooltip")} />
            </Label>
            <Input
              id={periodId}
              type="number"
              inputMode="numeric"
              value={values.periodCount}
              onChange={(e) => setField("periodCount", e.target.value)}
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">
              {t("fieldPeriodCountHint")}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={assessId} className="flex items-center gap-1">
              {t("fieldAssessmentCount")}
              <LockHint label={t("lockedTooltip")} />
            </Label>
            <Input
              id={assessId}
              type="number"
              inputMode="numeric"
              value={values.assessCount}
              onChange={(e) => setField("assessCount", e.target.value)}
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">
              {t("fieldAssessmentCountHint")}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={outcomeId}>{t("fieldOutcomeTargets")}</Label>
          <Textarea
            id={outcomeId}
            value={values.outcome}
            onChange={(e) => setField("outcome", e.target.value)}
            rows={3}
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={syllabusId}>{t("fieldMasterSyllabus")}</Label>
          <Input
            id={syllabusId}
            value={values.syllabus}
            onChange={(e) => setField("syllabus", e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={exerciseId}>{t("fieldExerciseBank")}</Label>
          <Input
            id={exerciseId}
            value={values.exercise}
            onChange={(e) => setField("exercise", e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={examId}>{t("fieldExamBank")}</Label>
          <Input
            id={examId}
            value={values.exam}
            onChange={(e) => setField("exam", e.target.value)}
            disabled={readOnly}
          />
        </div>
      </section>

      {/* Class offerings */}
      {showClassOfferings && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("classOfferingsSection")}
          </h3>
          {classOfferings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("classOfferingsEmpty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-[var(--edu-radius-btn)] border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="px-3 py-2 font-semibold text-foreground">
                      {t("offeringColClass")}
                    </th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      {t("offeringColYear")}
                    </th>
                    <th className="px-3 py-2 font-semibold text-foreground">
                      {t("offeringColTeacher")}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">
                      {t("offeringColStudents")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classOfferings.map((co) => (
                    <tr
                      key={co.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 text-foreground">
                        {co.className}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {co.academicYear}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {co.teacherName}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {co.studentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function LockHint({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="rounded-full text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Lock aria-hidden="true" className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
