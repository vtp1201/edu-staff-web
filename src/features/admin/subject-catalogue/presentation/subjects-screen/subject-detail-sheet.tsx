"use client";

import { ChevronRight, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type {
  PatchSubjectInput,
  Subject,
} from "../../domain/entities/subject.entity";
import type { SubjectActionResult } from "./subjects-screen.i-vm";

export interface SubjectDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentName: string;
  subject: Subject | null;
  classOfferings: ClassSubject[];
  loading: boolean;
  onSave: (id: string, data: PatchSubjectInput) => Promise<SubjectActionResult>;
}

export function SubjectDetailSheet({
  open,
  onOpenChange,
  parentName,
  subject,
  classOfferings,
  loading,
  onSave,
}: SubjectDetailSheetProps) {
  const t = useTranslations("subjectCatalogue.subjectDetail");
  const tSubjects = useTranslations("subjectCatalogue.subjects");
  const tErrors = useTranslations("subjectCatalogue.errors");

  const nameId = useId();
  const codeId = useId();
  const codeErrId = useId();
  const periodId = useId();
  const assessId = useId();
  const outcomeId = useId();
  const syllabusId = useId();
  const exerciseId = useId();
  const examId = useId();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [periodCount, setPeriodCount] = useState("");
  const [assessCount, setAssessCount] = useState("");
  const [outcome, setOutcome] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [exercise, setExercise] = useState("");
  const [exam, setExam] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setCode(subject.code ?? "");
      setPeriodCount(subject.periodCount?.toString() ?? "");
      setAssessCount(subject.requiredAssessmentCount?.toString() ?? "");
      setOutcome(subject.outcomeTargets);
      setSyllabus(subject.masterSyllabus);
      setExercise(subject.exerciseBankRef);
      setExam(subject.examBankRef);
      setError(null);
      setSaved(false);
    }
  }, [subject]);

  const handleSave = async () => {
    if (!subject) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    const data: PatchSubjectInput = {
      name: name.trim(),
      code: code.trim() === "" ? null : code.trim(),
      periodCount: periodCount === "" ? null : Number(periodCount),
      requiredAssessmentCount: assessCount === "" ? null : Number(assessCount),
      outcomeTargets: outcome,
      masterSyllabus: syllabus,
      exerciseBankRef: exercise,
      examBankRef: exam,
    };
    const result = await onSave(subject.id, data);
    setSaving(false);
    if (result.ok) {
      setSaved(true);
    } else {
      setError(tErrors(result.errorKey as never));
    }
  };

  const codeInvalid = error !== null;

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto sm:max-w-[520px]"
        >
          <SheetHeader>
            <nav
              aria-label={tSubjects("breadcrumbLabel")}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <span>{parentName}</span>
              <ChevronRight aria-hidden="true" className="size-3" />
              <span>{tSubjects("gradeScopedBreadcrumb")}</span>
            </nav>
            <SheetTitle>{subject?.name ?? ""}</SheetTitle>
          </SheetHeader>

          {loading || !subject ? (
            <div className="space-y-3 px-4 py-6" aria-busy="true">
              <div className="h-5 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 px-4 py-4">
              {/* Basic info */}
              <section className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("basicInfoSection")}
                </h3>
                <div className="grid gap-2">
                  <Label htmlFor={nameId}>{t("nameLabel")}</Label>
                  <Input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={128}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("nameHint")}
                  </p>
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
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (error) setError(null);
                    }}
                    maxLength={16}
                    aria-invalid={codeInvalid}
                    aria-describedby={codeInvalid ? codeErrId : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("codeHint")}
                  </p>
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
                    <Label
                      htmlFor={periodId}
                      className="flex items-center gap-1"
                    >
                      {t("fieldPeriodCount")}
                      <LockHint label={t("lockedTooltip")} />
                    </Label>
                    <Input
                      id={periodId}
                      type="number"
                      inputMode="numeric"
                      value={periodCount}
                      onChange={(e) => setPeriodCount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("fieldPeriodCountHint")}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor={assessId}
                      className="flex items-center gap-1"
                    >
                      {t("fieldAssessmentCount")}
                      <LockHint label={t("lockedTooltip")} />
                    </Label>
                    <Input
                      id={assessId}
                      type="number"
                      inputMode="numeric"
                      value={assessCount}
                      onChange={(e) => setAssessCount(e.target.value)}
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
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={syllabusId}>{t("fieldMasterSyllabus")}</Label>
                  <Input
                    id={syllabusId}
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={exerciseId}>{t("fieldExerciseBank")}</Label>
                  <Input
                    id={exerciseId}
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={examId}>{t("fieldExamBank")}</Label>
                  <Input
                    id={examId}
                    value={exam}
                    onChange={(e) => setExam(e.target.value)}
                  />
                </div>
              </section>

              {/* Class offerings */}
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
            </div>
          )}

          <SheetFooter>
            <div
              role="status"
              aria-live="polite"
              className="mr-auto text-sm text-edu-success-text"
            >
              {saved ? t("savedFeedback") : ""}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("closeButton")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading || !subject}
            >
              {t("saveButton")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
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
