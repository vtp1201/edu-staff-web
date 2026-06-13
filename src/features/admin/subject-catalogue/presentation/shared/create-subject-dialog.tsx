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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateSubjectInput } from "../../domain/entities/subject.entity";
import type { SubjectParent } from "../../domain/entities/subject-parent.entity";
import type {
  GradeRange,
  SubjectActionResult,
} from "../subjects-screen/subjects-screen.i-vm";

export interface CreateSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: SubjectParent;
  gradeRange: GradeRange;
  onSubmit: (data: CreateSubjectInput) => Promise<SubjectActionResult>;
}

export function CreateSubjectDialog({
  open,
  onOpenChange,
  parent,
  gradeRange,
  onSubmit,
}: CreateSubjectDialogProps) {
  const t = useTranslations("subjectCatalogue.createSubjectDialog");
  const tErrors = useTranslations("subjectCatalogue.errors");

  const nameId = useId();
  const gradeId = useId();
  const codeId = useId();
  const codeErrId = useId();
  const formErrId = useId();

  const grades = Array.from(
    { length: gradeRange.maxGrade - gradeRange.minGrade + 1 },
    (_, i) => gradeRange.minGrade + i,
  );

  const [name, setName] = useState("");
  const [grade, setGrade] = useState<number>(gradeRange.minGrade);
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const result = await onSubmit({
      parentId: parent.id,
      name: name.trim(),
      code: code.trim() === "" ? null : code.trim(),
      gradeLevel: grade,
    });
    setSubmitting(false);
    if (result.ok) {
      setName("");
      setCode("");
      setGrade(gradeRange.minGrade);
      onOpenChange(false);
    } else {
      setFormError(tErrors(result.errorKey as never));
    }
  };

  const codeInvalid = formError !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("departmentLabel")}
              </span>
              <span className="text-sm font-medium text-foreground">
                {parent.name}
              </span>
            </div>

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
            </div>

            <div className="grid gap-2">
              <Label htmlFor={gradeId}>{t("gradeLabel")}</Label>
              <Select
                value={String(grade)}
                onValueChange={(v) => setGrade(Number(v))}
              >
                <SelectTrigger id={gradeId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("gradeHint", {
                  min: gradeRange.minGrade,
                  max: gradeRange.maxGrade,
                })}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={codeId}>
                {t("codeLabel")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("codeOptional")})
                </span>
              </Label>
              <Input
                id={codeId}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (formError) setFormError(null);
                }}
                placeholder={t("codePlaceholder")}
                maxLength={16}
                aria-invalid={codeInvalid}
                aria-describedby={
                  codeInvalid ? `${codeErrId} ${formErrId}` : codeErrId
                }
              />
              <p id={codeErrId} className="text-xs text-muted-foreground">
                {t("codeHint")}
              </p>
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
              {t("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
