"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  MAX_BODY_LENGTH,
  MIN_BODY_LENGTH,
  type QuestionEntity,
} from "../../domain/entities/question.entity";
import type { QuestionBankFailure } from "../../domain/failures/question-bank.failure";
import { questionBankKeys } from "../question-bank.query-keys";
import type {
  QuestionBankBuilderScreenVM,
  QuestionBankDraftInput,
} from "./question-bank-builder-screen.i-vm";

/** Failure keys that translate to an EXISTING questionBank.errors key. */
type ErrorMsgKey =
  | "not-found"
  | "not-visible"
  | "forbidden-edit"
  | "forbidden-browse"
  | "body-required"
  | "search-filter-required"
  | "network-error"
  | "unknown";

/**
 * Map any failure to a translatable error key (only ones present in the
 * `questionBank.errors` namespace). BE-defensive field errors the client
 * already prevents (body-too-long, tag limits, invalid-difficulty,
 * type-not-supported, invalid-cursor) collapse to the generic `unknown`
 * toast — they are unreachable in practice. `subject-not-found` is routed
 * to the inline subject-field error (FR-008), NOT here.
 */
function toErrorMsgKey(key: QuestionBankFailure["type"]): ErrorMsgKey {
  switch (key) {
    case "not-found":
    case "not-visible":
    case "forbidden-edit":
    case "forbidden-browse":
    case "body-required":
    case "search-filter-required":
    case "network-error":
      return key;
    default:
      return "unknown";
  }
}

function draftFrom(q: QuestionEntity): QuestionBankDraftInput {
  return {
    questionType: q.questionType,
    subjectId: q.subjectId,
    gradeLevel: q.gradeLevel,
    difficulty: q.difficulty,
    body: q.body,
    expectedAnswer: q.expectedAnswer ?? "",
    tags: q.tags,
  };
}

/**
 * All builder local state (form + FR-010 publish gate + FR-011 dirty/locked +
 * publish flow + already-published race resync). Mirrors `useLessonPlanBuilder`.
 * No TanStack Query for reads — the question comes via RSC props; writes are
 * Server Actions inside `useTransition`. `useQueryClient` is used ONLY to bust
 * the list cache on success (state-architecture.md §5).
 */
export function useQuestionBankBuilder(vm: QuestionBankBuilderScreenVM) {
  const router = useRouter();
  const t = useTranslations("questionBank");
  const tErr = useTranslations("questionBank.errors");
  const queryClient = useQueryClient();

  const { initial } = vm;
  const [draft, setDraft] = useState<QuestionBankDraftInput>(() =>
    initial
      ? draftFrom(initial)
      : {
          questionType: "ESSAY",
          subjectId: vm.subjects[0]?.id ?? "",
          gradeLevel: vm.gradeOptions[0] ?? "",
          difficulty: "MEDIUM",
          body: "",
          expectedAnswer: "",
          tags: [],
        },
  );
  const [questionId, setQuestionId] = useState<string | undefined>(
    vm.questionId ?? initial?.id,
  );
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    initial?.status ?? "DRAFT",
  );
  const [publishedAt, setPublishedAt] = useState<string | undefined>(
    initial?.publishedAt,
  );

  const [bodyTouched, setBodyTouched] = useState(false);
  // FR-008: subject required (client) + `subject-not-found` API error both
  // surface on the subject field, never as a generic toast.
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [subjectApiError, setSubjectApiError] = useState<string | undefined>(
    undefined,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isPublishing, startPublish] = useTransition();

  const isEdit = questionId !== undefined || initial !== undefined;
  const isLocked = status === "PUBLISHED";
  const isBusy = isSaving || isPublishing;

  const bodyTrimmed = draft.body.trim();
  // FR-007: publish is gated on BODY validity ONLY — expectedAnswer never gates it.
  const bodyValid =
    bodyTrimmed.length >= MIN_BODY_LENGTH &&
    draft.body.length <= MAX_BODY_LENGTH;
  const isPublishable = bodyValid;
  const bodyInvalid = bodyTouched && !bodyValid;

  const subjectInvalid = subjectTouched && !draft.subjectId;
  // API error (subject archived/deleted) takes precedence over the required hint.
  const subjectError =
    subjectApiError ?? (subjectInvalid ? tErr("subject-required") : undefined);

  const busInvalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: questionBankKeys.listMineRoot(),
    });
  }, [queryClient]);

  const updateField = useCallback(
    (key: "body" | "expectedAnswer", value: string) => {
      if (isLocked) return;
      setDraft((d) => ({ ...d, [key]: value }));
      setIsDirty(true);
    },
    [isLocked],
  );

  const updateTags = useCallback(
    (tags: string[]) => {
      if (isLocked) return;
      setDraft((d) => ({ ...d, tags }));
      setIsDirty(true);
    },
    [isLocked],
  );

  // The 4 immutable fields are settable only in create mode (FR-009).
  const updateImmutable = useCallback(
    (patch: Partial<QuestionBankDraftInput>) => {
      if (isLocked || isEdit) return;
      // Picking a subject clears a stale `subject-not-found` API error.
      if (patch.subjectId !== undefined) setSubjectApiError(undefined);
      setDraft((d) => ({ ...d, ...patch }));
      setIsDirty(true);
    },
    [isLocked, isEdit],
  );

  const applyFailure = useCallback(
    (errorKey: QuestionBankFailure["type"]) => {
      // FR-008: subject archived/deleted → inline field error, not a toast.
      if (errorKey === "subject-not-found") {
        setSubjectTouched(true);
        setSubjectApiError(tErr("subject-not-found"));
        return;
      }
      if (
        errorKey === "not-found" ||
        errorKey === "not-visible" ||
        errorKey === "forbidden-edit" ||
        errorKey === "forbidden-browse"
      ) {
        toast.error(tErr(errorKey));
        router.push(vm.questionBankPath);
        return;
      }
      toast.error(tErr(toErrorMsgKey(errorKey)));
    },
    [router, tErr, vm.questionBankPath],
  );

  const resyncLocked = useCallback(
    async (id: string) => {
      const res = await vm.refetchAction(id);
      if (res.ok) {
        setDraft(draftFrom(res.question));
        setStatus(res.question.status);
        setPublishedAt(res.question.publishedAt);
        setIsDirty(false);
      }
      busInvalidate();
      queryClient.invalidateQueries({
        queryKey: ["question-bank", "search"],
        exact: false,
      });
      // INFORMATIONAL toast — NEVER a red error banner (AC-905.6/AC-904.8).
      toast.info(t("toast.published"));
    },
    [vm, busInvalidate, queryClient, t],
  );

  const handleSaveDraft = useCallback(() => {
    if (isBusy || isLocked) return;
    setSubjectTouched(true);
    startSave(async () => {
      const res = await vm.saveQuestionAction({ ...draft, id: questionId });
      if (!res.ok) {
        if (res.errorKey === "already-published" && questionId) {
          await resyncLocked(questionId);
          return;
        }
        applyFailure(res.errorKey);
        return;
      }
      const q = res.question;
      const wasCreate = questionId === undefined;
      setQuestionId(q.id);
      setStatus(q.status);
      setPublishedAt(q.publishedAt);
      setIsDirty(false);
      busInvalidate();
      toast.success(t("toast.draftSaved"));
      if (wasCreate) {
        router.push(`${vm.editPathPrefix}/${q.id}/edit`);
      }
    });
  }, [
    applyFailure,
    busInvalidate,
    draft,
    isBusy,
    isLocked,
    questionId,
    resyncLocked,
    router,
    t,
    vm,
  ]);

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
      setStatus(res.question.status);
      setPublishedAt(res.question.publishedAt);
      setIsDirty(false);
      busInvalidate();
      queryClient.invalidateQueries({
        queryKey: ["question-bank", "search"],
        exact: false,
      });
      toast.success(t("toast.published"));
    },
    [applyFailure, busInvalidate, queryClient, resyncLocked, t, vm],
  );

  const handlePublishClick = useCallback(() => {
    setBodyTouched(true);
    setSubjectTouched(true);
    if (!isPublishable) {
      toast.error(t("builder.publishDisabledHelper"));
      return;
    }
    setPublishDialogOpen(true);
  }, [isPublishable, t]);

  const handleConfirmPublish = useCallback(() => {
    if (isBusy) return;
    startPublish(async () => {
      let id = questionId;
      // Create mode: persist first so publish has a resource id.
      if (!id) {
        const saved = await vm.saveQuestionAction({ ...draft });
        if (!saved.ok) {
          setPublishDialogOpen(false);
          applyFailure(saved.errorKey);
          return;
        }
        id = saved.question.id;
        setQuestionId(id);
      }
      await doPublish(id);
    });
  }, [applyFailure, doPublish, draft, isBusy, questionId, vm]);

  return {
    draft,
    status,
    publishedAt,
    questionId,
    isEdit,
    isLocked,
    isDirty,
    isSaving,
    isPublishing,
    isBusy,
    bodyInvalid,
    subjectError,
    isPublishable,
    publishDialogOpen,
    updateField,
    updateTags,
    updateImmutable,
    markBodyTouched: () => setBodyTouched(true),
    markSubjectTouched: () => setSubjectTouched(true),
    handleSaveDraft,
    handlePublishClick,
    handleConfirmPublish,
    closePublishDialog: () => setPublishDialogOpen(false),
  };
}
