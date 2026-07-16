"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AssessmentColumn,
  ColumnType,
} from "../../domain/entities/assessment-scheme.entity";
import { TT22_PRESET } from "../../domain/entities/assessment-scheme.entity";
import type {
  GradeScale,
  GradeScaleBand,
  GradeScaleType,
} from "../../domain/entities/grade-scale.entity";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import {
  type SchemeValidationError,
  validateAssessmentScheme,
} from "../../domain/use-cases/validate-assessment-scheme.use-case";
import {
  type GradeScaleValidationError,
  validateGradeScale,
} from "../../domain/use-cases/validate-grade-scale.use-case";
import type { AssessmentSchemeScreenProps } from "./assessment-scheme-screen.i-vm";

const DEFAULT_YEAR = "2024-2025";

// Hardcoded term list — matches the existing precedent in
// `teacher/teaching-plan/page.tsx` (`MOCK_TERMS`). No calendar-service round
// trip is wired to this screen yet (US-E18.7 / ADR 0053).
const MOCK_TERMS = ["HK1", "HK2"] as const;

const BAND_COLOR_TONE: Record<GradeScaleBand["colorToken"], StatusTone> = {
  success: "success",
  primary: "primary",
  warning: "warning",
  error: "error",
};

const COLUMN_TYPE_TONE: Record<ColumnType, StatusTone> = {
  TX: "primary",
  GK: "warning",
  CK: "error",
};

const GRADE_SCALE_VALIDATION_KEY: Record<GradeScaleValidationError, string> = {
  EMPTY_BANDS: "errorEmptyBands",
  LOWEST_BAND_NOT_ZERO: "errorLowestBandNotZero",
  OVERLAPPING_THRESHOLDS: "errorOverlappingThresholds",
  GAPS_IN_COVERAGE: "errorGapsInCoverage",
};

const SCHEME_VALIDATION_KEY: Record<SchemeValidationError, string> = {
  EMPTY_COLUMNS: "errorEmptyColumns",
  WEIGHT_SUM_NOT_100: "errorWeightSumNot100",
  INVALID_COUNT: "errorInvalidCount",
};

// Maps both server failure `type`s (AssessmentSchemeFailure) and the two
// client-only save-boundary keys ("invalid-grade-scale"/"invalid-scheme",
// returned by the Server Actions when client validation rejects) to i18n keys.
// `SaveResult.errorKey` is a plain string, so client + server keys coexist here.
const FAILURE_KEY: Record<string, string> = {
  "not-found": "errorNotFound",
  forbidden: "errorForbidden",
  "invalid-scale-type": "errorInvalidScaleType",
  "letter-grades-required": "errorLetterGradesRequiredServer",
  "invalid-column": "errorInvalidColumn",
  "column-in-use": "errorColumnInUse",
  "max-columns": "errorMaxColumns",
  "network-error": "errorNetwork",
  unknown: "errorUnknown",
  // client-side validation fallbacks (US-E18.7)
  "invalid-grade-scale": "errorInvalidGradeScale",
  "invalid-scheme": "errorInvalidScheme",
};

let bandSeq = 0;
function newBandId(): string {
  bandSeq += 1;
  return `band-${bandSeq}`;
}

let columnSeq = 0;
function newColumnId(): string {
  columnSeq += 1;
  return `col-${columnSeq}`;
}

export function AssessmentSchemeScreen({
  initialGradeScale,
  initialError,
  availableGradeLevels,
  onSaveGradeScale,
  onSaveAssessmentScheme,
  onLoadSubjectsForGrade,
  onLoadAssessmentScheme,
}: AssessmentSchemeScreenProps) {
  const t = useTranslations("assessmentScheme");

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      <GradeScaleEditor
        initialGradeScale={initialGradeScale}
        initialError={initialError}
        onSaveGradeScale={onSaveGradeScale}
      />

      <SchemeEditor
        availableGradeLevels={availableGradeLevels}
        onSaveAssessmentScheme={onSaveAssessmentScheme}
        onLoadSubjectsForGrade={onLoadSubjectsForGrade}
        onLoadAssessmentScheme={onLoadAssessmentScheme}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Grade Scale editor                                               */
/* ---------------------------------------------------------------- */

function GradeScaleEditor({
  initialGradeScale,
  initialError,
  onSaveGradeScale,
}: Pick<
  AssessmentSchemeScreenProps,
  "initialGradeScale" | "initialError" | "onSaveGradeScale"
>) {
  const t = useTranslations("assessmentScheme");
  const errorId = useId();

  const [scale, setScale] = useState<GradeScale>(
    initialGradeScale ?? GRADE_SCALE_PRESETS.SCALE_10,
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // A11Y-045: focus management — track newly added band id for auto-focus
  const newBandIdRef = useRef<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  const validationError = validateGradeScale(scale.bands, scale.maxScore);

  function applyPreset(type: GradeScaleType) {
    setScale(structuredClone(GRADE_SCALE_PRESETS[type]));
    setSaveMessage(null);
  }

  function updateBand(id: string, patch: Partial<GradeScaleBand>) {
    setScale((prev) => ({
      ...prev,
      bands: prev.bands.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
    setSaveMessage(null);
  }

  function addBand() {
    const id = newBandId();
    newBandIdRef.current = id;
    setScale((prev) => ({
      ...prev,
      bands: [
        ...prev.bands,
        { id, label: "", minThreshold: 0, colorToken: "primary" },
      ],
    }));
    setSaveMessage(null);
  }

  function deleteBand(id: string) {
    setScale((prev) => ({
      ...prev,
      bands: prev.bands.filter((b) => b.id !== id),
    }));
    setSaveMessage(null);
    // Return focus to the add button after row removal
    addButtonRef.current?.focus();
  }

  async function handleSave() {
    if (validationError) return;
    setSaving(true);
    setSaveMessage(null);
    const result = await onSaveGradeScale({ scale });
    setSaving(false);
    if (result.ok) {
      setSaveMessage({ tone: "success", text: t("saveSuccess") });
    } else {
      const key = result.errorKey
        ? (FAILURE_KEY[result.errorKey] ?? "errorUnknown")
        : "saveError";
      setSaveMessage({ tone: "error", text: t(key as "saveError") });
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="font-extrabold text-foreground text-lg">
          {t("gradeScaleSection")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("gradeScaleSectionSubtitle")}
        </p>
      </div>

      {initialError ? (
        <p className="mb-4 text-edu-error-text text-sm" role="alert">
          {t(
            (FAILURE_KEY[initialError.type] ??
              "errorUnknown") as "errorUnknown",
          )}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("SCALE_10")}
        >
          {t("presetThang10")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("SCALE_4")}
        >
          {t("presetThang4")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("LETTER")}
        >
          {t("presetLetter")}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {scale.bands.map((band) => (
          <div
            key={band.id}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3"
          >
            <StatusBadge tone={BAND_COLOR_TONE[band.colorToken]}>
              {band.label || "—"}
            </StatusBadge>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`band-label-${band.id}`} className="text-xs">
                {t("bandLabel")}
              </Label>
              <Input
                id={`band-label-${band.id}`}
                value={band.label}
                aria-label={t("bandLabel")}
                // A11Y-045: auto-focus the label input of the newly added band
                ref={
                  band.id === newBandIdRef.current
                    ? (el) => {
                        if (el) {
                          el.focus();
                          newBandIdRef.current = null;
                        }
                      }
                    : undefined
                }
                onChange={(e) => updateBand(band.id, { label: e.target.value })}
                className="w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`band-min-${band.id}`} className="text-xs">
                {t("bandMinThreshold")}
              </Label>
              <Input
                id={`band-min-${band.id}`}
                type="number"
                min={0}
                max={scale.maxScore}
                step="0.1"
                value={band.minThreshold}
                aria-label={t("bandMinThreshold")}
                aria-invalid={!!validationError}
                aria-describedby={validationError ? errorId : undefined}
                onChange={(e) =>
                  updateBand(band.id, {
                    minThreshold: Number(e.target.value),
                  })
                }
                className="w-28"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`band-color-${band.id}`} className="text-xs">
                {t("bandColor")}
              </Label>
              <Select
                value={band.colorToken}
                onValueChange={(v) =>
                  updateBand(band.id, {
                    colorToken: v as GradeScaleBand["colorToken"],
                  })
                }
              >
                <SelectTrigger id={`band-color-${band.id}`} className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">{t("colorSuccess")}</SelectItem>
                  <SelectItem value="primary">{t("colorPrimary")}</SelectItem>
                  <SelectItem value="warning">{t("colorWarning")}</SelectItem>
                  <SelectItem value="error">{t("colorError")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("deleteBand")}
              onClick={() => deleteBand(band.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {validationError ? (
        <p
          id={errorId}
          className="mt-3 text-edu-error-text text-sm"
          role="alert"
        >
          {t(GRADE_SCALE_VALIDATION_KEY[validationError] as "errorEmptyBands")}
        </p>
      ) : null}

      {saveMessage ? (
        <p
          className={
            saveMessage.tone === "success"
              ? "mt-3 text-edu-success-text text-sm"
              : "mt-3 text-edu-error-text text-sm"
          }
          role="status"
        >
          {saveMessage.text}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button
          ref={addButtonRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={addBand}
        >
          <Plus className="size-4" />
          {t("addBand")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!!validationError || saving}
          onClick={handleSave}
        >
          {saving ? t("loading") : t("saveBands")}
        </Button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Assessment Scheme editor                                         */
/* ---------------------------------------------------------------- */

function SchemeEditor({
  availableGradeLevels,
  onSaveAssessmentScheme,
  onLoadSubjectsForGrade,
  onLoadAssessmentScheme,
}: Pick<
  AssessmentSchemeScreenProps,
  | "availableGradeLevels"
  | "onSaveAssessmentScheme"
  | "onLoadSubjectsForGrade"
  | "onLoadAssessmentScheme"
>) {
  const t = useTranslations("assessmentScheme");
  const errorId = useId();
  const termSelectId = useId();

  const [gradeLevel, setGradeLevel] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [columns, setColumns] = useState<AssessmentColumn[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // A11Y-045: focus management for newly added column
  const newColumnIdRef = useRef<string | null>(null);
  const addColumnButtonRef = useRef<HTMLButtonElement | null>(null);

  const subjectsQuery = useQuery({
    queryKey: ["assessment-subjects", gradeLevel],
    queryFn: () => onLoadSubjectsForGrade(gradeLevel as number),
    enabled: gradeLevel !== null,
  });

  const schemeQuery = useQuery({
    queryKey: ["assessment-scheme", subjectId, DEFAULT_YEAR, termId],
    queryFn: () =>
      onLoadAssessmentScheme(
        subjectId as string,
        DEFAULT_YEAR,
        termId as string,
      ),
    enabled: subjectId !== null && termId !== null,
  });

  // Sync loaded scheme columns into editable local state.
  useEffect(() => {
    if (schemeQuery.data) {
      setColumns(structuredClone(schemeQuery.data.columns));
      setSaveMessage(null);
    }
  }, [schemeQuery.data]);

  const validationError = validateAssessmentScheme(columns);
  const weightSum = columns.reduce((acc, c) => acc + c.weight, 0);

  function updateColumn(id: string, patch: Partial<AssessmentColumn>) {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
    setSaveMessage(null);
  }

  function addColumn() {
    const id = newColumnId();
    newColumnIdRef.current = id;
    setColumns((prev) => [
      ...prev,
      { id, type: "TX", label: "", count: 1, weight: 0 },
    ]);
    setSaveMessage(null);
  }

  function deleteColumn(id: string) {
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setSaveMessage(null);
    // A11Y-045: return focus to add-column button after row removal
    addColumnButtonRef.current?.focus();
  }

  function applyTT22() {
    setColumns(structuredClone(TT22_PRESET));
    setSaveMessage(null);
  }

  async function handleSave() {
    if (validationError || !subjectId || !termId) return;
    setSaving(true);
    setSaveMessage(null);
    const result = await onSaveAssessmentScheme({
      scheme: { subjectId, yearLabel: DEFAULT_YEAR, termId, columns },
    });
    setSaving(false);
    if (result.ok) {
      setSaveMessage({ tone: "success", text: t("saveSuccess") });
    } else {
      const key = result.errorKey
        ? (FAILURE_KEY[result.errorKey] ?? "errorUnknown")
        : "saveError";
      setSaveMessage({ tone: "error", text: t(key as "saveError") });
    }
  }

  const subjects = subjectsQuery.data ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="font-extrabold text-foreground text-lg">
          {t("assessmentSchemeSection")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("assessmentSchemeSectionSubtitle")}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="grade-level-select" className="text-xs">
            {t("gradeLevelLabel")}
          </Label>
          <Select
            value={gradeLevel !== null ? String(gradeLevel) : undefined}
            onValueChange={(v) => {
              setGradeLevel(Number(v));
              setSubjectId(null);
              setColumns([]);
            }}
          >
            <SelectTrigger id="grade-level-select" className="w-48">
              <SelectValue placeholder={t("gradeLevelPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {availableGradeLevels.map((g) => (
                <SelectItem key={g} value={String(g)}>
                  {t("gradePrefix")} {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="subject-select" className="text-xs">
            {t("subjectLabel")}
          </Label>
          <Select
            value={subjectId ?? undefined}
            disabled={gradeLevel === null || subjectsQuery.isLoading}
            onValueChange={(v) => setSubjectId(v)}
          >
            <SelectTrigger id="subject-select" className="w-56">
              <SelectValue placeholder={t("subjectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={termSelectId} className="text-xs">
            {t("termLabel")}
          </Label>
          <Select
            value={termId ?? undefined}
            onValueChange={(v) => setTermId(v)}
          >
            <SelectTrigger id={termSelectId} className="w-40">
              <SelectValue placeholder={t("termPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {MOCK_TERMS.map((term) => (
                <SelectItem key={term} value={term}>
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* A11Y-046: live region so SR announces when no subjects found after grade selection */}
      {gradeLevel !== null &&
      !subjectsQuery.isLoading &&
      subjects.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          role="status"
          aria-live="polite"
        >
          {t("noSubjectsForGrade")}
        </p>
      ) : null}

      {/* Prompt to pick a term before the scheme can load (US-E18.7). */}
      {subjectId && !termId ? (
        <p
          className="text-muted-foreground text-sm"
          role="status"
          aria-live="polite"
        >
          {t("termPromptBody")}
        </p>
      ) : null}

      {/* A11Y-043: skeleton loading state — accessible name + aria-hidden bones */}
      {subjectId && termId && schemeQuery.isLoading ? (
        <div
          className="flex flex-col gap-2"
          role="status"
          aria-label={t("loading")}
          aria-busy="true"
        >
          <Skeleton className="h-12 w-full" aria-hidden="true" />
          <Skeleton className="h-12 w-full" aria-hidden="true" />
          <Skeleton className="h-12 w-full" aria-hidden="true" />
          <span className="sr-only">{t("loading")}</span>
        </div>
      ) : null}

      {subjectId && subjectsQuery.isError ? (
        <p role="alert" className="text-sm text-edu-error-text">
          {t("errorNetwork")}
        </p>
      ) : null}

      {subjectId && termId && schemeQuery.isError ? (
        <p role="alert" className="text-sm text-edu-error-text">
          {t("errorNetwork")}
        </p>
      ) : null}

      {subjectId && termId && !schemeQuery.isLoading && !schemeQuery.isError ? (
        <>
          <div className="mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyTT22}
            >
              {t("applyPresetTT22")}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {columns.map((col) => (
              <div
                key={col.id}
                className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`col-type-${col.id}`} className="text-xs">
                    {t("columnType")}
                  </Label>
                  <Select
                    value={col.type}
                    onValueChange={(v) =>
                      updateColumn(col.id, { type: v as ColumnType })
                    }
                  >
                    <SelectTrigger id={`col-type-${col.id}`} className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TX">{t("columnTypeTX")}</SelectItem>
                      <SelectItem value="GK">{t("columnTypeGK")}</SelectItem>
                      <SelectItem value="CK">{t("columnTypeCK")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <StatusBadge tone={COLUMN_TYPE_TONE[col.type]}>
                  {col.type}
                </StatusBadge>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`col-label-${col.id}`} className="text-xs">
                    {t("columnLabel")}
                  </Label>
                  {/* A11Y-045: auto-focus label input of newly added column */}
                  <Input
                    id={`col-label-${col.id}`}
                    value={col.label}
                    aria-label={t("columnLabel")}
                    ref={
                      col.id === newColumnIdRef.current
                        ? (el) => {
                            if (el) {
                              el.focus();
                              newColumnIdRef.current = null;
                            }
                          }
                        : undefined
                    }
                    onChange={(e) =>
                      updateColumn(col.id, { label: e.target.value })
                    }
                    className="w-40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`col-count-${col.id}`} className="text-xs">
                    {t("columnCount")}
                  </Label>
                  {/* A11Y-042: per-column count error with aria-describedby */}
                  <Input
                    id={`col-count-${col.id}`}
                    type="number"
                    min={1}
                    value={col.count}
                    aria-label={t("columnCount")}
                    aria-invalid={col.count < 1}
                    aria-describedby={
                      col.count < 1 ? `col-count-error-${col.id}` : undefined
                    }
                    onChange={(e) =>
                      updateColumn(col.id, { count: Number(e.target.value) })
                    }
                    className="w-24"
                  />
                  {col.count < 1 ? (
                    <p
                      id={`col-count-error-${col.id}`}
                      className="text-edu-error-text text-xs"
                      role="alert"
                    >
                      {t("errorInvalidCount")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`col-weight-${col.id}`} className="text-xs">
                    {t("columnWeight")}
                  </Label>
                  <Input
                    id={`col-weight-${col.id}`}
                    type="number"
                    min={0}
                    max={100}
                    value={col.weight}
                    aria-label={t("columnWeight")}
                    aria-invalid={!!validationError}
                    aria-describedby={validationError ? errorId : undefined}
                    onChange={(e) =>
                      updateColumn(col.id, { weight: Number(e.target.value) })
                    }
                    className="w-24"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("deleteColumn")}
                  onClick={() => deleteColumn(col.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* A11Y-041: weight-sum live region — announces changes to SR + icon for non-color signal */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">
              {t("weightSumLabel")}:
            </span>
            <span
              role="status"
              aria-live="polite"
              aria-label={
                Math.abs(weightSum - 100) > 0.01
                  ? t("weightSumInvalid", { value: weightSum })
                  : t("weightSumValid", { value: weightSum })
              }
              className={
                Math.abs(weightSum - 100) > 0.01
                  ? "font-bold text-edu-error-text"
                  : "font-bold text-edu-success-text"
              }
            >
              {weightSum}
              {Math.abs(weightSum - 100) > 0.01 ? (
                <span className="sr-only">{t("weightSumInvalidSR")}</span>
              ) : null}
            </span>
            <span className="text-muted-foreground">
              {t("weightSumTarget")}
            </span>
          </div>

          {validationError ? (
            <p
              id={errorId}
              className="mt-3 text-edu-error-text text-sm"
              role="alert"
            >
              {t(SCHEME_VALIDATION_KEY[validationError] as "errorEmptyColumns")}
            </p>
          ) : null}

          {saveMessage ? (
            <p
              className={
                saveMessage.tone === "success"
                  ? "mt-3 text-edu-success-text text-sm"
                  : "mt-3 text-edu-error-text text-sm"
              }
              role="status"
            >
              {saveMessage.text}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button
              ref={addColumnButtonRef}
              type="button"
              variant="outline"
              size="sm"
              onClick={addColumn}
            >
              <Plus className="size-4" />
              {t("addColumn")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!!validationError || saving}
              onClick={handleSave}
            >
              {saving ? t("loading") : t("saveScheme")}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
