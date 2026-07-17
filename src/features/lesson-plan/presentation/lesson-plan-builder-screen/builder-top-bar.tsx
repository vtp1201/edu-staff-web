"use client";

import { Check, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { DetailPanelHeader } from "@/components/shared/detail-panel-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { LessonPlanStatus } from "../../domain/entities/lesson-plan.entity";

export interface BuilderTopBarProps {
  title: string;
  status: LessonPlanStatus;
  isLocked: boolean;
  isSaving: boolean;
  isBusy: boolean;
  isPublishable: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublishClick: () => void;
}

/**
 * Builder top bar — composes `DetailPanelHeader` (back + title + actions) with
 * the status chip and Save/Publish CTAs. When locked, NO Save/Publish controls
 * are rendered at all (absent, not disabled — AC-005.4). The Publish CTA is
 * `aria-disabled` + points at a visible helper via `aria-describedby` when the
 * FR-003 gate is unmet (AC-003.3 — deliberate departure from exam-bank's
 * opacity-only precedent).
 */
export function BuilderTopBar({
  title,
  status,
  isLocked,
  isSaving,
  isBusy,
  isPublishable,
  onBack,
  onSaveDraft,
  onPublishClick,
}: BuilderTopBarProps) {
  const t = useTranslations("lessonPlan");
  const draft = status === "DRAFT";
  const helperId = "lp-publish-helper";

  return (
    <div className="flex flex-col">
      <DetailPanelHeader
        backLabel={t("builder.back")}
        onBack={onBack}
        title={title}
        actions={
          <>
            <StatusBadge tone={draft ? "warning" : "success"}>
              {draft ? (
                <PenLine className="size-3" aria-hidden="true" />
              ) : (
                <Check className="size-3" aria-hidden="true" />
              )}
              <span className="sr-only sm:not-sr-only">
                {draft ? t("status.draft") : t("status.published")}
              </span>
            </StatusBadge>
            {!isLocked && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onSaveDraft}
                  aria-busy={isSaving}
                  disabled={isBusy}
                >
                  <PenLine className="size-4 sm:mr-1.5" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">
                    {isSaving ? t("builder.saving") : t("builder.saveDraft")}
                  </span>
                </Button>
                <Button
                  type="button"
                  onClick={onPublishClick}
                  aria-disabled={!isPublishable}
                  aria-describedby={!isPublishable ? helperId : undefined}
                  disabled={isBusy}
                >
                  <Check className="size-4 sm:mr-1.5" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">
                    {t("builder.publish")}
                  </span>
                </Button>
              </>
            )}
          </>
        }
      />
      {!isLocked && !isPublishable && (
        <p
          id={helperId}
          className="border-border border-b bg-card px-4 py-1.5 text-edu-text-secondary text-xs"
        >
          {t("builder.publishDisabledHelper")}
        </p>
      )}
    </div>
  );
}
