"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type {
  CreateExamInput,
  UpdateExamInput,
} from "../../domain/entities/exam-bank-input.entity";
import type { QuestionFailureType } from "../../domain/use-cases/validate-questions";
import { validateQuestion } from "../../domain/use-cases/validate-questions";
import { PublishConfirmDialog } from "../exam-bank-screen/publish-confirm-dialog";
import { BuilderActionBar } from "./builder-action-bar";
import { BuilderHeader } from "./builder-header";
import type { ExamBuilderScreenVM } from "./exam-builder-screen.i-vm";
import { McqEditor } from "./mcq-editor";
import { QuestionList } from "./question-list";
import { useExamBuilder } from "./use-exam-builder";

const EXAM_BANK_LIST_PATH = "/teacher/exam-bank";

export function ExamBuilderScreen({
  initial,
  subjects,
  saveDraftAction,
  createExamAction,
  publishExamAction,
}: ExamBuilderScreenVM) {
  const t = useTranslations("examBank");
  const router = useRouter();
  const builder = useExamBuilder(initial);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isPublishing, startPublish] = useTransition();
  const [savedExamId, setSavedExamId] = useState<string | undefined>(
    initial?.id,
  );
  const [titleTouched, setTitleTouched] = useState(false);

  // Per-question validation errors (id → failure type).
  const validationErrors = useMemo(() => {
    const map = new Map<string, QuestionFailureType>();
    for (const q of builder.questions) {
      const failure = validateQuestion(q);
      if (failure) map.set(q.id, failure);
    }
    return map;
  }, [builder.questions]);

  const isPublishable =
    builder.questions.length > 0 && validationErrors.size === 0;
  const errorIds = useMemo(
    () => new Set(validationErrors.keys()),
    [validationErrors],
  );

  const selectedQuestion =
    builder.selectedIdx !== null
      ? (builder.questions[builder.selectedIdx] ?? null)
      : null;
  const selectedError = selectedQuestion
    ? (validationErrors.get(selectedQuestion.id) ?? null)
    : null;

  function buildCreateInput(): CreateExamInput {
    return {
      title: builder.meta.title,
      subjectId: builder.meta.subjectId,
      durationMinutes: builder.meta.durationMinutes,
      maxAttempts: builder.meta.maxAttempts,
      questions: builder.questions,
    };
  }

  function buildUpdateInput(id: string): UpdateExamInput {
    return { id, ...buildCreateInput() };
  }

  function handleSaveDraft(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!builder.meta.title.trim()) {
        setTitleTouched(true);
        toast.error(t("errors.missing-title"));
        resolve(null);
        return;
      }
      startSave(async () => {
        if (savedExamId) {
          const result = await saveDraftAction(buildUpdateInput(savedExamId));
          if (result.ok) {
            toast.success(t("toast.draftSaved"));
            resolve(savedExamId);
          } else {
            toast.error(t(`errors.${result.errorKey}`));
            resolve(null);
          }
        } else {
          const result = await createExamAction(buildCreateInput());
          if (result.ok) {
            setSavedExamId(result.id);
            toast.success(t("toast.draftSaved"));
            resolve(result.id);
          } else {
            toast.error(t(`errors.${result.errorKey}`));
            resolve(null);
          }
        }
      });
    });
  }

  function handlePublishClick() {
    if (!isPublishable) return;
    setPublishDialogOpen(true);
  }

  function confirmPublish() {
    startPublish(async () => {
      // Save first to ensure the latest content is persisted, then publish.
      const id = await handleSaveDraft();
      if (!id) {
        setPublishDialogOpen(false);
        return;
      }
      const result = await publishExamAction(id);
      setPublishDialogOpen(false);
      if (result.ok) {
        toast.success(t("toast.published"));
        router.push(EXAM_BANK_LIST_PATH);
      } else {
        toast.error(t(`errors.${result.errorKey}`));
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <header>
        <h1 className="sr-only">
          {initial?.id ? t("builder.editTitle") : t("builder.createTitle")}
        </h1>
        <BuilderActionBar
          isSaving={isSaving}
          isPublishable={isPublishable}
          onBack={() => router.push(EXAM_BANK_LIST_PATH)}
          onSaveDraft={() => void handleSaveDraft()}
          onPublish={handlePublishClick}
        />
      </header>

      <div className="border-border border-b bg-card px-6 py-4">
        <BuilderHeader
          meta={builder.meta}
          subjects={subjects}
          titleInvalid={titleTouched && !builder.meta.title.trim()}
          onChange={builder.updateExamMeta}
        />
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,30%)_minmax(0,70%)]">
        {/* Left: question list */}
        <aside
          className="overflow-y-auto border-border border-r bg-background p-4"
          aria-label={t("builder.questionListAriaLabel")}
        >
          <h2 className="mb-3 font-bold text-muted-foreground text-xs uppercase tracking-wide">
            {t("builder.questionsHeading", {
              count: builder.questions.length,
            })}
          </h2>
          <QuestionList
            questions={builder.questions}
            selectedIdx={builder.selectedIdx}
            errorIds={errorIds}
            onSelect={builder.selectQuestion}
            onMoveUp={(idx) => builder.reorderQuestions(idx, idx - 1)}
            onMoveDown={(idx) => builder.reorderQuestions(idx, idx + 1)}
            onAddQuestion={builder.addQuestion}
          />
        </aside>

        {/* Right: MCQ editor */}
        <section
          className="overflow-y-auto bg-background p-6"
          aria-label={t("builder.editorAriaLabel")}
        >
          <McqEditor
            question={selectedQuestion}
            error={selectedError}
            onChange={(patch) => {
              if (selectedQuestion) {
                builder.updateQuestion(selectedQuestion.id, patch);
              }
            }}
          />
        </section>
      </div>

      <PublishConfirmDialog
        open={publishDialogOpen}
        isPublishing={isPublishing}
        onConfirm={confirmPublish}
        onCancel={() => setPublishDialogOpen(false)}
      />
    </div>
  );
}
