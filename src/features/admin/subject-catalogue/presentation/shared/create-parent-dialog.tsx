"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/shared/utils";
import type {
  ConceptMode,
  ConceptType,
  CreateParentInput,
  SubjectParent,
} from "../../domain/entities/subject-parent.entity";
import type { ParentActionResult } from "../subject-departments-screen/subject-departments-screen.i-vm";

const CONCEPT_OPTIONS: { mode: ConceptMode; labelKey: string }[] = [
  { mode: "BO_MON", labelKey: "conceptBomon" },
  { mode: "TO", labelKey: "conceptTo" },
  { mode: "KHOA", labelKey: "conceptKhoa" },
  { mode: "CUSTOM", labelKey: "conceptCustom" },
];

function modeFromParent(parent: SubjectParent): ConceptMode {
  if (parent.conceptLabelCustom) return "CUSTOM";
  return parent.conceptType ?? "BO_MON";
}

function toConceptType(mode: ConceptMode): ConceptType {
  if (mode === "BO_MON" || mode === "TO" || mode === "KHOA") return mode;
  return null;
}

export interface CreateParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in edit mode. */
  parent?: SubjectParent | null;
  onSubmit: (data: CreateParentInput) => Promise<ParentActionResult>;
}

export function CreateParentDialog({
  open,
  onOpenChange,
  parent,
  onSubmit,
}: CreateParentDialogProps) {
  const t = useTranslations("subjectCatalogue.createParentDialog");
  const tErrors = useTranslations("subjectCatalogue.errors");
  const isEdit = Boolean(parent);

  const nameId = useId();
  const customId = useId();
  const customErrId = useId();
  const formErrId = useId();

  const [name, setName] = useState(parent?.name ?? "");
  const [mode, setMode] = useState<ConceptMode>(
    parent ? modeFromParent(parent) : "BO_MON",
  );
  const [customLabel, setCustomLabel] = useState(
    parent?.conceptLabelCustom ?? "",
  );
  const [customError, setCustomError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (mode === "CUSTOM" && customLabel.trim() === "") {
      setCustomError(true);
      return;
    }
    setCustomError(false);
    setSubmitting(true);
    const result = await onSubmit({
      name: name.trim(),
      conceptType: toConceptType(mode),
      conceptLabelCustom: mode === "CUSTOM" ? customLabel.trim() : null,
    });
    setSubmitting(false);
    if (result.ok) {
      onOpenChange(false);
    } else {
      setFormError(tErrors(result.errorKey as never));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("editTitle") : t("createTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEdit ? t("editSubtitle") : t("createSubtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={nameId}>{t("nameLabel")}</Label>
              <Input
                id={nameId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={128}
                required
              />
              <p className="text-xs text-muted-foreground">{t("nameHint")}</p>
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                {t("conceptLabel")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("conceptOptional")})
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                {CONCEPT_OPTIONS.map((opt) => {
                  const active = mode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMode(opt.mode)}
                      className={cn(
                        "rounded-[var(--edu-radius-btn)] border px-3 py-2 text-sm font-medium",
                        "motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-primary/12 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {t(opt.labelKey as never)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("conceptHint")}
              </p>

              {mode === "CUSTOM" && (
                <div className="grid gap-1">
                  <Label htmlFor={customId} className="sr-only">
                    {t("conceptCustom")}
                  </Label>
                  <Input
                    id={customId}
                    value={customLabel}
                    onChange={(e) => {
                      setCustomLabel(e.target.value);
                      if (customError) setCustomError(false);
                    }}
                    placeholder={t("customLabelPlaceholder")}
                    aria-invalid={customError}
                    aria-describedby={customError ? customErrId : undefined}
                    maxLength={64}
                  />
                  {customError && (
                    <p
                      id={customErrId}
                      className="text-xs text-edu-error-text"
                      role="alert"
                    >
                      {t("customLabelRequired")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {formError && (
              <p
                id={formErrId}
                role="alert"
                className="text-sm text-edu-error-text"
              >
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancelButton")}
            </Button>
            <Button type="submit" disabled={submitting || name.trim() === ""}>
              {isEdit ? t("saveButton") : t("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
