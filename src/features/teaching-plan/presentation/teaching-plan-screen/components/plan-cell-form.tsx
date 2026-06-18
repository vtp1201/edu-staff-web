"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlanCellVM } from "../teaching-plan-screen.i-vm";

export interface PlanCellDraft {
  week: number;
  period: number;
  title: string;
  learningObjective: string;
  notes: string;
}

type Props = {
  week: number;
  period: number;
  initial?: PlanCellVM;
  isPending: boolean;
  onSave: (draft: PlanCellDraft) => void;
  onCancel: () => void;
};

export function PlanCellForm({
  week,
  period,
  initial,
  isPending,
  onSave,
  onCancel,
}: Props) {
  const t = useTranslations("teachingPlan");
  const titleId = useId();
  const titleErrId = useId();
  const objectiveId = useId();
  const notesId = useId();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [learningObjective, setLearningObjective] = useState(
    initial?.learningObjective ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [showError, setShowError] = useState(false);

  const titleInvalid = showError && title.trim().length === 0;

  const handleSave = () => {
    if (title.trim().length === 0) {
      setShowError(true);
      return;
    }
    onSave({ week, period, title, learningObjective, notes });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keyboard shortcut container (Esc/Ctrl+Enter) — not interactive itself, wraps real inputs
    <div className="flex flex-col gap-3 p-1" onKeyDown={handleKeyDown}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={titleId} className="text-xs">
          {t("cell.title")}
        </Label>
        <Input
          id={titleId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("cell.titlePlaceholder")}
          aria-invalid={titleInvalid}
          aria-describedby={titleInvalid ? titleErrId : undefined}
          autoFocus
        />
        {titleInvalid ? (
          <p id={titleErrId} className="text-edu-error-text text-xs">
            {t("cell.titleRequired")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={objectiveId} className="text-xs">
          {t("cell.learningObjective")}
        </Label>
        <Textarea
          id={objectiveId}
          value={learningObjective}
          onChange={(e) => setLearningObjective(e.target.value)}
          placeholder={t("cell.learningObjectivePlaceholder")}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={notesId} className="text-xs">
          {t("cell.notes")}
        </Label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("cell.notesPlaceholder")}
          rows={2}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("cell.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending}
        >
          {t("cell.save")}
        </Button>
      </div>
    </div>
  );
}
