"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type {
  PatchSubjectInput,
  Subject,
} from "../../domain/entities/subject.entity";
import type { SubjectActionResult } from "./subjects-screen.i-vm";

/**
 * Shared subject master-editor form state (US-E12.13).
 *
 * Extracted verbatim out of `subject-detail-sheet.tsx` so the Sheet
 * (quick-edit from the Subjects table) and the full-page deep-link route
 * `/admin/subjects/[id]` share ONE implementation of the field snapshot,
 * `PatchSubjectInput` construction and save handling
 * (`.claude/rules/component-organization.md`, decision `0026`).
 *
 * Each consumer keeps its OWN footer chrome (SheetFooter vs. page save bar),
 * which is why this is a hook + a presentational `SubjectDetailFields`
 * component rather than one monolithic form component.
 */
export interface SubjectFormValues {
  name: string;
  code: string;
  periodCount: string;
  assessCount: string;
  outcome: string;
  syllabus: string;
  exercise: string;
  exam: string;
}

export type SubjectFormField = keyof SubjectFormValues;

export function emptyFormValues(): SubjectFormValues {
  return {
    name: "",
    code: "",
    periodCount: "",
    assessCount: "",
    outcome: "",
    syllabus: "",
    exercise: "",
    exam: "",
  };
}

/** Snapshot an entity into editable string form values. */
export function toFormValues(subject: Subject | null): SubjectFormValues {
  if (!subject) return emptyFormValues();
  return {
    name: subject.name,
    code: subject.code ?? "",
    periodCount: subject.periodCount?.toString() ?? "",
    assessCount: subject.requiredAssessmentCount?.toString() ?? "",
    outcome: subject.outcomeTargets,
    syllabus: subject.masterSyllabus,
    exercise: subject.exerciseBankRef,
    exam: subject.examBankRef,
  };
}

/** Build the wire payload; blank code/counts mean "clear" (null). */
export function toPatchInput(values: SubjectFormValues): PatchSubjectInput {
  const code = values.code.trim();
  return {
    name: values.name.trim(),
    code: code === "" ? null : code,
    periodCount: values.periodCount === "" ? null : Number(values.periodCount),
    requiredAssessmentCount:
      values.assessCount === "" ? null : Number(values.assessCount),
    outcomeTargets: values.outcome,
    masterSyllabus: values.syllabus,
    exerciseBankRef: values.exercise,
    examBankRef: values.exam,
  };
}

export interface SubjectDetailForm {
  values: SubjectFormValues;
  setField: (field: SubjectFormField, value: string) => void;
  saving: boolean;
  saved: boolean;
  /** Already-translated error message (presentation boundary), or null. */
  error: string | null;
  handleSave: () => Promise<void>;
}

export function useSubjectDetailForm(
  subject: Subject | null,
  onSave: (id: string, data: PatchSubjectInput) => Promise<SubjectActionResult>,
): SubjectDetailForm {
  const tErrors = useTranslations("subjectCatalogue.errors");

  const [values, setValues] = useState<SubjectFormValues>(emptyFormValues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (subject) {
      setValues(toFormValues(subject));
      setError(null);
      setSaved(false);
    }
  }, [subject]);

  const setField = useCallback((field: SubjectFormField, value: string) => {
    // The subject code is stored upper-case; editing it clears a stale
    // validation error so the field is no longer flagged while retyping.
    if (field === "code") {
      setValues((prev) => ({ ...prev, code: value.toUpperCase() }));
      setError(null);
      return;
    }
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!subject) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    const result = await onSave(subject.id, toPatchInput(values));
    setSaving(false);
    if (result.ok) {
      setSaved(true);
    } else {
      setError(tErrors(result.errorKey as never));
    }
  }, [subject, onSave, values, tErrors]);

  return { values, setField, saving, saved, error, handleSave };
}
