"use client";

import { Save, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { DetailPanelHeader } from "@/components/shared/detail-panel-header";
import { Button } from "@/components/ui/button";

type BuilderActionBarProps = {
  isSaving: boolean;
  isPublishable: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

export function BuilderActionBar({
  isSaving,
  isPublishable,
  onBack,
  onSaveDraft,
  onPublish,
}: BuilderActionBarProps) {
  const t = useTranslations("examBank");

  return (
    <DetailPanelHeader
      backLabel={t("builder.backAriaLabel")}
      onBack={onBack}
      actions={
        <>
          {/* Action buttons carry their own aria-label; the visible text label
              collapses to icon-only below md via `sr-only md:not-sr-only`
              (still announced to screen readers on mobile). */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving}
            aria-busy={isSaving}
            aria-label={isSaving ? t("builder.saving") : t("builder.saveDraft")}
          >
            <Save className="size-4" aria-hidden="true" />
            <span className="sr-only md:not-sr-only">
              {isSaving ? t("builder.saving") : t("builder.saveDraft")}
            </span>
          </Button>
          <Button
            size="sm"
            onClick={!isPublishable || isSaving ? undefined : onPublish}
            aria-disabled={!isPublishable || isSaving}
            aria-label={t("builder.publish")}
            className={
              !isPublishable || isSaving ? "cursor-not-allowed opacity-50" : ""
            }
          >
            <Send className="size-4" aria-hidden="true" />
            <span className="sr-only md:not-sr-only">
              {t("builder.publish")}
            </span>
          </Button>
        </>
      }
    />
  );
}
