"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubjectOption } from "../exam-bank-screen/exam-bank-screen.i-vm";
import type { ExamBuilderMeta } from "./use-exam-builder";

type BuilderHeaderProps = {
  meta: ExamBuilderMeta;
  subjects: SubjectOption[];
  titleInvalid?: boolean;
  /** False in real mode: `subjectId` is immutable server-side (clone-routing
   *  key, omitted from `UpdateExamPaperRequest`) and `maxAttempts` has no wire
   *  field at all, so both would be silently discarded on save. Disable them
   *  rather than report a false success (review MUST FIX, US-E18.28). */
  metaEditable?: boolean;
  onChange: (patch: Partial<ExamBuilderMeta>) => void;
};

export function BuilderHeader({
  meta,
  subjects,
  titleInvalid = false,
  metaEditable = true,
  onChange,
}: BuilderHeaderProps) {
  const t = useTranslations("examBank");
  // One explainer for both locked fields, referenced by each via
  // aria-describedby so the reason is announced, not just visible.
  const lockedNoteId = "exam-meta-locked-note";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="exam-title">{t("builder.titleLabel")}</Label>
        <Input
          id="exam-title"
          value={meta.title}
          placeholder={t("builder.titlePlaceholder")}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-invalid={titleInvalid}
          aria-describedby={titleInvalid ? "exam-title-error" : undefined}
        />
        {titleInvalid && (
          <p id="exam-title-error" className="text-edu-error-text text-xs">
            {t("errors.missing-title")}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="exam-subject">{t("builder.subjectLabel")}</Label>
        <Select
          value={meta.subjectId}
          disabled={!metaEditable}
          onValueChange={(v) => onChange({ subjectId: v })}
        >
          <SelectTrigger
            id="exam-subject"
            className="w-full"
            aria-describedby={metaEditable ? undefined : lockedNoteId}
          >
            <SelectValue placeholder={t("builder.subjectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="exam-duration">{t("builder.durationLabel")}</Label>
          <Input
            id="exam-duration"
            type="number"
            min={1}
            value={meta.durationMinutes}
            onChange={(e) =>
              onChange({ durationMinutes: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exam-attempts">{t("builder.maxAttemptsLabel")}</Label>
          <Input
            id="exam-attempts"
            type="number"
            min={1}
            value={meta.maxAttempts}
            disabled={!metaEditable}
            aria-describedby={metaEditable ? undefined : lockedNoteId}
            onChange={(e) =>
              onChange({ maxAttempts: Number(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      {!metaEditable && (
        <p
          id={lockedNoteId}
          className="text-muted-foreground text-xs sm:col-span-2 lg:col-span-4"
        >
          {t("builder.metaLockedNote")}
        </p>
      )}
    </div>
  );
}
