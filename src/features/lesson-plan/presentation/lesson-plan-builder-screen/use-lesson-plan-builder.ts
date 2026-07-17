"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type DocumentSectionKey,
  MAX_TITLE_LENGTH,
  MIN_TITLE_LENGTH,
} from "../../domain/entities/lesson-plan.entity";
import type { LessonPlanFailure } from "../../domain/failures/lesson-plan.failure";
import type {
  LessonPlanBuilderScreenVM,
  LessonPlanDraftInput,
} from "./lesson-plan-builder-screen.i-vm";

export type BuilderFieldKey = keyof LessonPlanDraftInput;
type ErrorFieldKey = "title" | "tags" | "subjectId";

const SECTION_KEYS: DocumentSectionKey[] = [
  "objectives",
  "contentOutline",
  "activities",
  "assessmentMethod",
];

const EMPTY_DRAFT: LessonPlanDraftInput = {
  title: "",
  gradeLevel: "",
  tags: [],
  objectives: "",
  contentOutline: "",
  activities: "",
  assessmentMethod: "",
};

/** Which field an errorKey renders against (else it is a generic toast). */
function fieldForError(
  key: LessonPlanFailure["type"],
): ErrorFieldKey | undefined {
  switch (key) {
    case "title-required":
    case "title-too-long":
      return "title";
    case "tag-limit-exceeded":
    case "tag-too-long":
      return "tags";
    case "subject-not-found":
      return "subjectId";
    default:
      return undefined;
  }
}

/**
 * All builder local state (form + FR-003 gate + FR-010 dirty + publish flow +
 * already-published race resync). Mirrors `use-exam-builder`. No TanStack Query
 * inside — reads come via RSC props; writes are Server Actions.
 */
export function useLessonPlanBuilder(vm: LessonPlanBuilderScreenVM) {
  const router = useRouter();
  const t = useTranslations("lessonPlan");
  const tErr = useTranslations("lessonPlan.errors");

  const { initial } = vm;
  const [draft, setDraft] = useState<LessonPlanDraftInput>(() =>
    initial
      ? {
          title: initial.title,
          gradeLevel: initial.gradeLevel,
          tags: initial.tags,
          objectives: initial.objectives,
          contentOutline: initial.contentOutline,
          activities: initial.activities,
          assessmentMethod: initial.assessmentMethod,
        }
      : { ...EMPTY_DRAFT, gradeLevel: vm.gradeOptions[0] ?? "" },
  );
  const [subjectId, setSubjectId] = useState<string>(
    initial?.subjectId ?? vm.subjects[0]?.id ?? "",
  );
  const [planId, setPlanId] = useState<string | undefined>(
    vm.planId ?? initial?.planId,
  );
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    initial?.status ?? "DRAFT",
  );
  const [publishedAt, setPublishedAt] = useState<string | undefined>(
    initial?.publishedAt,
  );

  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<
        ErrorFieldKey,
        Exclude<LessonPlanFailure["type"], "invalid-cursor">
      >
    >
  >({});
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishBlocked, setPublishBlocked] = useState(false);
  const [raceBannerVisible, setRaceBannerVisible] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isPublishing, startPublish] = useTransition();

  const isEdit = planId !== undefined || initial !== undefined;
  const isLocked = status === "PUBLISHED";
  const isBusy = isSaving || isPublishing;

  const titleTrimmed = draft.title.trim();
  const titleValid =
    titleTrimmed.length >= MIN_TITLE_LENGTH &&
    draft.title.length <= MAX_TITLE_LENGTH;
  const sectionsFilled = SECTION_KEYS.every((k) => draft[k].trim().length > 0);
  const isPublishable = titleValid && sectionsFilled;

  const updateField = useCallback(
    (key: BuilderFieldKey, value: string) => {
      if (isLocked) return;
      setDraft((d) => ({ ...d, [key]: value }));
      setIsDirty(true);
      if (key === "title") setFieldErrors((e) => ({ ...e, title: undefined }));
    },
    [isLocked],
  );

  const updateTags = useCallback(
    (tags: string[]) => {
      if (isLocked) return;
      setDraft((d) => ({ ...d, tags }));
      setIsDirty(true);
      setFieldErrors((e) => ({ ...e, tags: undefined }));
    },
    [isLocked],
  );

  const updateSubject = useCallback(
    (id: string) => {
      if (isLocked || isEdit) return; // immutable post-create
      setSubjectId(id);
      setIsDirty(true);
      setFieldErrors((e) => ({ ...e, subjectId: undefined }));
    },
    [isLocked, isEdit],
  );

  const markTouched = useCallback((key: string) => {
    setTouched((tt) => ({ ...tt, [key]: true }));
  }, []);

  const applyFailure = useCallback(
    (errorKey: LessonPlanFailure["type"]) => {
      const field = fieldForError(errorKey);
      if (field && errorKey !== "invalid-cursor") {
        setFieldErrors((e) => ({ ...e, [field]: errorKey }));
        return;
      }
      if (
        errorKey === "not-found" ||
        errorKey === "not-visible" ||
        errorKey === "forbidden"
      ) {
        toast.error(tErr(errorKey));
        router.push(vm.lessonPlansPath);
        return;
      }
      if (errorKey === "invalid-cursor") return; // never surfaced here
      toast.error(tErr(errorKey));
    },
    [router, tErr, vm.lessonPlansPath],
  );

  const resyncLocked = useCallback(
    async (id: string) => {
      setRaceBannerVisible(true);
      const res = await vm.refetchAction(id);
      if (res.ok) {
        const p = res.plan;
        setDraft({
          title: p.title,
          gradeLevel: p.gradeLevel,
          tags: p.tags,
          objectives: p.objectives,
          contentOutline: p.contentOutline,
          activities: p.activities,
          assessmentMethod: p.assessmentMethod,
        });
        setSubjectId(p.subjectId);
        setStatus(p.status);
        setPublishedAt(p.publishedAt);
        setIsDirty(false);
      }
    },
    [vm],
  );

  const handleSaveDraft = useCallback(() => {
    if (isBusy || isLocked) return;
    startSave(async () => {
      const res = await vm.saveDraftAction({ ...draft, subjectId, id: planId });
      if (!res.ok) {
        if (res.errorKey === "already-published" && planId) {
          await resyncLocked(planId);
          return;
        }
        applyFailure(res.errorKey);
        return;
      }
      const p = res.plan;
      const wasCreate = planId === undefined;
      setPlanId(p.planId);
      setStatus(p.status);
      setPublishedAt(p.publishedAt);
      setIsDirty(false);
      setTouched({});
      toast.success(t("toast.draftSaved"));
      if (wasCreate) {
        router.push(`${vm.editPathPrefix}/${p.planId}/edit`);
      }
    });
  }, [
    applyFailure,
    draft,
    isBusy,
    isLocked,
    planId,
    resyncLocked,
    router,
    subjectId,
    t,
    vm,
  ]);

  const handlePublishClick = useCallback(() => {
    setTouched({
      title: true,
      objectives: true,
      contentOutline: true,
      activities: true,
      assessmentMethod: true,
    });
    if (!isPublishable) {
      setPublishBlocked(true);
      toast.error(t("builder.publishDisabledHelper"));
      return;
    }
    setPublishBlocked(false);
    setPublishDialogOpen(true);
  }, [isPublishable, t]);

  const doPublish = useCallback(
    async (id: string) => {
      const res = await vm.publishAction(id);
      setPublishDialogOpen(false);
      if (!res.ok) {
        if (res.errorKey === "already-published") {
          await resyncLocked(id);
          return;
        }
        applyFailure(res.errorKey);
        return;
      }
      const p = res.plan;
      setStatus(p.status);
      setPublishedAt(p.publishedAt);
      setIsDirty(false);
      toast.success(t("toast.published"));
    },
    [applyFailure, resyncLocked, t, vm],
  );

  const handleConfirmPublish = useCallback(() => {
    if (isBusy) return;
    startPublish(async () => {
      let id = planId;
      // Create mode: persist first so publish has a resource id.
      if (!id) {
        const saved = await vm.saveDraftAction({ ...draft, subjectId });
        if (!saved.ok) {
          setPublishDialogOpen(false);
          applyFailure(saved.errorKey);
          return;
        }
        id = saved.plan.planId;
        setPlanId(id);
      }
      await doPublish(id);
    });
  }, [applyFailure, doPublish, draft, isBusy, planId, subjectId, vm]);

  const invalidSections = useMemo(() => {
    const map: Partial<Record<DocumentSectionKey, boolean>> = {};
    for (const k of SECTION_KEYS) {
      map[k] = Boolean(touched[k]) && draft[k].trim().length === 0;
    }
    return map;
  }, [draft, touched]);

  return {
    draft,
    subjectId,
    status,
    publishedAt,
    planId,
    isEdit,
    isLocked,
    isDirty,
    isSaving,
    isPublishing,
    isBusy,
    touched,
    fieldErrors,
    invalidSections,
    titleValid,
    isPublishable,
    publishBlocked,
    publishDialogOpen,
    raceBannerVisible,
    updateField,
    updateTags,
    updateSubject,
    markTouched,
    handleSaveDraft,
    handlePublishClick,
    handleConfirmPublish,
    closePublishDialog: () => setPublishDialogOpen(false),
    dismissRaceBanner: () => setRaceBannerVisible(false),
  };
}
