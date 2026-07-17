"use client";

import { Check, ChevronLeft, Loader2, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PublishConfirmDialog } from "@/components/shared/publish-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import {
  MAX_BODY_LENGTH,
  MAX_EXPECTED_ANSWER_LENGTH,
  type QuestionType,
} from "../../domain/entities/question.entity";
import { QBStatusChip } from "../question-bank-list-screen/qb-status-chip";
import { QuestionBankErrorState } from "../question-bank-list-screen/question-bank-error-state";
import { QBLockedBanner } from "./qb-locked-banner";
import { QBMetaGrid } from "./qb-meta-grid";
import { QBQuestionTypeSelector } from "./qb-question-type-selector";
import { QBTagChipsInput } from "./qb-tag-chips-input";
import type { QuestionBankBuilderScreenVM } from "./question-bank-builder-screen.i-vm";
import { useQuestionBankBuilder } from "./use-question-bank-builder";

const BODY_ROWS: Record<QuestionType, number> = {
  ESSAY: 6,
  SHORT_ANSWER: 4,
  FILL_IN: 3,
};
const ANSWER_ROWS: Record<QuestionType, number> = {
  ESSAY: 4,
  SHORT_ANSWER: 2,
  FILL_IN: 2,
};
const BODY_PLACEHOLDER_KEY = {
  ESSAY: "bodyPlaceholderEssay",
  SHORT_ANSWER: "bodyPlaceholderShortAnswer",
  FILL_IN: "bodyPlaceholderFillIn",
} as const satisfies Record<QuestionType, string>;
const ANSWER_PLACEHOLDER_KEY = {
  ESSAY: "expectedAnswerPlaceholderEssay",
  SHORT_ANSWER: "expectedAnswerPlaceholderShortAnswer",
  FILL_IN: "expectedAnswerPlaceholderFillIn",
} as const satisfies Record<QuestionType, string>;

const FIELD_LABEL_CLASS =
  "mb-1.5 block font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide";

export function QuestionBankBuilderScreen({
  vm,
}: {
  vm: QuestionBankBuilderScreenVM;
}) {
  const router = useRouter();
  const t = useTranslations("questionBank");
  const tBuilder = useTranslations("questionBank.builder");
  const tPublish = useTranslations("questionBank.publishDialog");
  const b = useQuestionBankBuilder(vm);

  // A transient edit-route GET failure stays on the route with a retry.
  if (vm.loadFailed && !vm.initial) {
    return (
      <main className="mx-auto w-full max-w-[760px] px-4 py-6 md:px-6">
        <QuestionBankErrorState
          title={t("error.title")}
          message={t("error.description")}
          retryLabel={t("error.retry")}
          onRetry={() => router.refresh()}
        />
      </main>
    );
  }

  const qType = b.draft.questionType;
  const bodyErrorId = "qb-body-err";
  const publishHelperId = "qb-publish-helper";

  return (
    <main className="flex flex-1 flex-col bg-background">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-border border-b bg-card px-4 py-3 md:px-6">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push(vm.questionBankPath)}
          aria-label={tBuilder("backAriaLabel")}
        >
          <ChevronLeft className="size-4 sm:mr-1.5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{tBuilder("back")}</span>
        </Button>
        <p className="min-w-0 flex-1 truncate font-extrabold text-base text-foreground">
          {b.draft.body.trim() ||
            tBuilder(b.isEdit ? "editTitle" : "createTitle")}
        </p>
        <QBStatusChip status={b.status} />
        {!b.isLocked && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={b.handleSaveDraft}
              aria-busy={b.isSaving}
              disabled={b.isBusy}
            >
              {b.isSaving ? (
                <Loader2
                  className="size-4 motion-safe:animate-spin sm:mr-1.5"
                  aria-hidden="true"
                />
              ) : (
                <PenLine className="size-4 sm:mr-1.5" aria-hidden="true" />
              )}
              <span className="sr-only sm:not-sr-only">
                {b.isSaving ? tBuilder("saving") : tBuilder("saveDraft")}
              </span>
            </Button>
            <Button
              type="button"
              onClick={b.handlePublishClick}
              aria-disabled={!b.isPublishable}
              aria-describedby={!b.isPublishable ? publishHelperId : undefined}
              disabled={b.isBusy}
              className={cn(!b.isPublishable && "opacity-70")}
            >
              <Check className="size-4 sm:mr-1.5" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">
                {tBuilder("publish")}
              </span>
            </Button>
          </>
        )}
      </div>

      {!b.isLocked && !b.isPublishable && (
        <p
          id={publishHelperId}
          className="border-border border-b bg-card px-4 py-1.5 text-edu-text-secondary text-xs md:px-6"
        >
          {tBuilder("publishDisabledHelper")}
        </p>
      )}

      {b.isLocked && (
        <QBLockedBanner
          publishedAtDisplay={
            b.publishedAt
              ? new Date(b.publishedAt).toLocaleDateString()
              : undefined
          }
        />
      )}

      {b.isDirty && !b.isLocked && (
        <div className="flex items-center gap-2 border-border border-b bg-edu-warning/8 px-6 py-1.5">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-edu-warning"
          />
          <span className="font-bold text-edu-warning-foreground text-xs">
            {tBuilder("unsaved")}
          </span>
        </div>
      )}

      {/* Single-column form body (maxWidth 760, NO lg: 2-col split — NFR-005) */}
      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-[760px] flex-col gap-4">
          <QBQuestionTypeSelector
            value={qType}
            disabled={b.isLocked || b.isEdit}
            onChange={(questionType) => b.updateImmutable({ questionType })}
          />

          <QBMetaGrid
            subjectId={b.draft.subjectId}
            gradeLevel={b.draft.gradeLevel}
            difficulty={b.draft.difficulty}
            subjects={vm.subjects}
            gradeOptions={vm.gradeOptions}
            disabled={b.isLocked || b.isEdit}
            onSubjectChange={(subjectId) => b.updateImmutable({ subjectId })}
            onGradeChange={(gradeLevel) => b.updateImmutable({ gradeLevel })}
            onDifficultyChange={(difficulty) =>
              b.updateImmutable({ difficulty })
            }
          />

          {/* Body */}
          <div className="rounded-xl border border-border bg-card p-4.5">
            <Label htmlFor="qb-body" className={FIELD_LABEL_CLASS}>
              {tBuilder("bodyLabel")}{" "}
              <span aria-hidden="true" className="text-edu-error-text">
                *
              </span>
            </Label>
            <Textarea
              id="qb-body"
              rows={BODY_ROWS[qType]}
              maxLength={MAX_BODY_LENGTH}
              value={b.draft.body}
              disabled={b.isLocked}
              aria-required="true"
              aria-invalid={b.bodyInvalid}
              aria-describedby={b.bodyInvalid ? bodyErrorId : undefined}
              placeholder={tBuilder(BODY_PLACEHOLDER_KEY[qType])}
              onChange={(e) => b.updateField("body", e.target.value)}
              onBlur={b.markBodyTouched}
              className={cn(b.bodyInvalid && "border-edu-error-text")}
            />
            {b.bodyInvalid && (
              <p
                id={bodyErrorId}
                role="alert"
                className="mt-1.5 text-edu-error-text text-xs"
              >
                {tBuilder("bodyMinHelper")}
              </p>
            )}
          </div>

          {/* Expected answer — OPTIONAL for all types (FR-007), never gates save/publish */}
          <div className="rounded-xl border border-border bg-card p-4.5">
            <Label htmlFor="qb-answer" className={FIELD_LABEL_CLASS}>
              {tBuilder("expectedAnswerLabel")}
            </Label>
            <Textarea
              id="qb-answer"
              rows={ANSWER_ROWS[qType]}
              maxLength={MAX_EXPECTED_ANSWER_LENGTH}
              value={b.draft.expectedAnswer}
              disabled={b.isLocked}
              placeholder={tBuilder(ANSWER_PLACEHOLDER_KEY[qType])}
              onChange={(e) => b.updateField("expectedAnswer", e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-border bg-card p-4.5">
            <Label className={FIELD_LABEL_CLASS}>{tBuilder("tagsLabel")}</Label>
            <QBTagChipsInput
              tags={b.draft.tags}
              isLocked={b.isLocked}
              onChange={b.updateTags}
            />
            <p className="mt-2 text-edu-text-secondary text-xs">
              {tBuilder("tagsHelper")}
            </p>
          </div>
        </div>
      </div>

      <PublishConfirmDialog
        open={b.publishDialogOpen}
        isLoading={b.isPublishing}
        onConfirm={b.handleConfirmPublish}
        onCancel={b.closePublishDialog}
        labels={{
          title: tPublish("title"),
          body: tPublish("body"),
          confirm: tPublish("confirm"),
          publishing: tPublish("publishing"),
          cancel: tPublish("cancel"),
        }}
      />
    </main>
  );
}
