"use client";

import { CheckSquare, Flag, List, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LessonPlanErrorState } from "../lesson-plan-list-screen/lesson-plan-error-state";
import { BuilderTopBar } from "./builder-top-bar";
import { DocumentSectionField } from "./document-section-field";
import type { LessonPlanBuilderScreenVM } from "./lesson-plan-builder-screen.i-vm";
import { PlanMetaPanel } from "./plan-meta-panel";
import { PublishConfirmDialog } from "./publish-confirm-dialog";
import { PublishedLockedBanner } from "./published-locked-banner";
import { useLessonPlanBuilder } from "./use-lesson-plan-builder";

const SECTIONS = [
  {
    key: "objectives",
    icon: Flag,
    labelKey: "objectivesLabel",
    placeholderKey: "objectivesPlaceholder",
    requiredErrorKey: "objectives-required",
  },
  {
    key: "contentOutline",
    icon: List,
    labelKey: "contentOutlineLabel",
    placeholderKey: "contentOutlinePlaceholder",
    requiredErrorKey: "content-outline-required",
  },
  {
    key: "activities",
    icon: Users,
    labelKey: "activitiesLabel",
    placeholderKey: "activitiesPlaceholder",
    requiredErrorKey: "activities-required",
  },
  {
    key: "assessmentMethod",
    icon: CheckSquare,
    labelKey: "assessmentMethodLabel",
    placeholderKey: "assessmentMethodPlaceholder",
    requiredErrorKey: "assessment-method-required",
  },
] as const;

export function LessonPlanBuilderScreen({
  vm,
}: {
  vm: LessonPlanBuilderScreenVM;
}) {
  const router = useRouter();
  const t = useTranslations("lessonPlan");
  const tBuilder = useTranslations("lessonPlan.builder");
  const tErr = useTranslations("lessonPlan.errors");
  const tPublish = useTranslations("lessonPlan.publishDialog");
  const b = useLessonPlanBuilder(vm);

  // AC-008.6 — a transient edit-route GET failure stays on the route with a
  // retry (RSC re-fetch), never a redirect (that's for not-found/access-denied).
  if (vm.loadFailed && !vm.initial) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-4 py-6 md:px-6">
        <LessonPlanErrorState
          title={t("error.title")}
          message={t("error.description")}
          retryLabel={t("error.retry")}
          onRetry={() => router.refresh()}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      <BuilderTopBar
        title={
          b.draft.title || tBuilder(b.isEdit ? "editTitle" : "createTitle")
        }
        status={b.status}
        isLocked={b.isLocked}
        isSaving={b.isSaving}
        isBusy={b.isBusy}
        isPublishable={b.isPublishable}
        onBack={() => router.push(vm.lessonPlansPath)}
        onSaveDraft={b.handleSaveDraft}
        onPublishClick={b.handlePublishClick}
      />

      {b.isLocked && (
        <PublishedLockedBanner
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

      {b.raceBannerVisible && (
        <div
          role="alert"
          className="flex items-center gap-2.5 border-border border-b bg-edu-error/10 px-6 py-2"
        >
          <span className="flex-1 text-edu-error-text text-sm">
            {tErr("already-published")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={b.dismissRaceBanner}
            aria-label={t("error.retry")}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <div className="mx-auto grid max-w-[1180px] items-start gap-5 lg:grid-cols-[320px_1fr]">
          <PlanMetaPanel
            title={b.draft.title}
            subjectId={b.subjectId}
            gradeLevel={b.draft.gradeLevel}
            tags={b.draft.tags}
            subjects={vm.subjects}
            gradeOptions={vm.gradeOptions}
            isLocked={b.isLocked}
            isEdit={b.isEdit}
            titleInvalid={Boolean(b.touched.title) && !b.titleValid}
            fieldErrors={b.fieldErrors}
            onTitleChange={(v) => b.updateField("title", v)}
            onTitleBlur={() => b.markTouched("title")}
            onGradeChange={(v) => b.updateField("gradeLevel", v)}
            onSubjectChange={b.updateSubject}
            onTagsChange={b.updateTags}
          />

          <div className="flex flex-col gap-4">
            {SECTIONS.map((sec) => (
              <DocumentSectionField
                key={sec.key}
                sectionKey={sec.key}
                icon={sec.icon}
                label={tBuilder(sec.labelKey)}
                placeholder={tBuilder(sec.placeholderKey)}
                requiredError={tErr(sec.requiredErrorKey)}
                value={b.draft[sec.key]}
                isLocked={b.isLocked}
                isInvalid={Boolean(b.invalidSections[sec.key])}
                onChange={(v) => b.updateField(sec.key, v)}
                onBlur={() => b.markTouched(sec.key)}
              />
            ))}
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
