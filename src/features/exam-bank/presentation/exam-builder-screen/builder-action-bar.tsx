"use client";

import { ArrowLeft, Save, Send } from "lucide-react";
import { useTranslations } from "next-intl";
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
    <div className="flex items-center justify-between gap-3 border-border border-b bg-card px-6 py-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        aria-label={t("builder.backAriaLabel")}
      >
        <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
        {t("builder.back")}
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          <Save className="mr-1.5 size-4" aria-hidden="true" />
          {isSaving ? t("builder.saving") : t("builder.saveDraft")}
        </Button>
        <Button
          size="sm"
          onClick={onPublish}
          disabled={!isPublishable || isSaving}
          aria-disabled={!isPublishable}
        >
          <Send className="mr-1.5 size-4" aria-hidden="true" />
          {t("builder.publish")}
        </Button>
      </div>
    </div>
  );
}
