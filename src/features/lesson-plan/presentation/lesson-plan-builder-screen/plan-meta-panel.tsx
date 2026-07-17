"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { TagChipsInput } from "@/components/shared/tag-chips-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/shared/utils";
import {
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
} from "../../domain/entities/lesson-plan.entity";
import type { LessonPlanFailure } from "../../domain/failures/lesson-plan.failure";
import type { SubjectOption } from "../shared.i-vm";

type ErrorFieldKey = "title" | "tags" | "subjectId";

export interface PlanMetaPanelProps {
  title: string;
  subjectId: string;
  gradeLevel: string;
  tags: string[];
  subjects: SubjectOption[];
  gradeOptions: string[];
  isLocked: boolean;
  /** Edit route → subject Select is always disabled (immutable, AC-002.8). */
  isEdit: boolean;
  createdAtDisplay?: string;
  publishedAtDisplay?: string;
  titleInvalid: boolean;
  fieldErrors: Partial<
    Record<ErrorFieldKey, Exclude<LessonPlanFailure["type"], "invalid-cursor">>
  >;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  onGradeChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
}

export function PlanMetaPanel({
  title,
  subjectId,
  gradeLevel,
  tags,
  subjects,
  gradeOptions,
  isLocked,
  isEdit,
  createdAtDisplay,
  publishedAtDisplay,
  titleInvalid,
  fieldErrors,
  onTitleChange,
  onTitleBlur,
  onGradeChange,
  onSubjectChange,
  onTagsChange,
}: PlanMetaPanelProps) {
  const t = useTranslations("lessonPlan.builder");
  const tErr = useTranslations("lessonPlan.errors");

  const titleError = titleInvalid || Boolean(fieldErrors.title);
  const titleErrorId = "lp-title-err";
  const subjectDisabled = isLocked || isEdit;

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-4.5">
      {/* Title */}
      <div>
        <Label
          htmlFor="lp-title"
          className="mb-1.5 block font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide"
        >
          {t("titleLabel")}{" "}
          <span aria-hidden="true" className="text-edu-error-text">
            *
          </span>
        </Label>
        <Input
          id="lp-title"
          value={title}
          disabled={isLocked}
          maxLength={MAX_TITLE_LENGTH}
          aria-required="true"
          aria-invalid={titleError}
          aria-describedby={titleError ? titleErrorId : undefined}
          placeholder={t("titlePlaceholder")}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          className={cn(titleError && "border-edu-error-text")}
        />
        {titleError && (
          <p
            id={titleErrorId}
            role="alert"
            className="mt-1.5 flex items-center gap-1 text-edu-error-text text-xs"
          >
            <AlertTriangle className="size-3" aria-hidden="true" />
            {tErr(fieldErrors.title ?? "title-required")}
          </p>
        )}
      </div>

      {/* Subject — disabled/read-only on the edit route (immutable) */}
      <div>
        <Label
          htmlFor="lp-subject"
          className="mb-1.5 block font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide"
        >
          {t("subjectLabel")}
        </Label>
        <Select
          value={subjectId}
          disabled={subjectDisabled}
          onValueChange={onSubjectChange}
        >
          <SelectTrigger id="lp-subject" className="w-full">
            <SelectValue placeholder={t("subjectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.subjectId && (
          <p role="alert" className="mt-1.5 text-edu-error-text text-xs">
            {tErr(fieldErrors.subjectId)}
          </p>
        )}
      </div>

      {/* Grade level */}
      <div>
        <Label
          htmlFor="lp-grade"
          className="mb-1.5 block font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide"
        >
          {t("gradeLevelLabel")}
        </Label>
        <Select
          value={gradeLevel}
          disabled={isLocked}
          onValueChange={onGradeChange}
        >
          <SelectTrigger id="lp-grade" className="w-full">
            <SelectValue placeholder={t("gradeLevelPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {gradeOptions.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div>
        <Label className="mb-1.5 block font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide">
          {t("tagsLabel")}
        </Label>
        <TagChipsInput
          tags={tags}
          isLocked={isLocked}
          onChange={onTagsChange}
          maxTags={MAX_TAGS}
          maxTagLength={MAX_TAG_LENGTH}
          labels={{
            placeholder: t("tagsPlaceholder"),
            inputAriaLabel: t("tagsLabel"),
            maxTagsHelper: tErr("tag-limit-exceeded"),
            tagTooLongError: tErr("tag-too-long"),
            removeAriaLabelOf: (tag) => t("tagRemoveAriaLabel", { tag }),
          }}
        />
        {fieldErrors.tags && (
          <p role="alert" className="mt-1.5 text-edu-error-text text-xs">
            {tErr(fieldErrors.tags)}
          </p>
        )}
      </div>

      {(createdAtDisplay || publishedAtDisplay) && (
        <div className="flex flex-col gap-1 border-border border-t pt-2.5 text-edu-text-secondary text-[11px]">
          {createdAtDisplay && <span>{createdAtDisplay}</span>}
          {publishedAtDisplay && <span>{publishedAtDisplay}</span>}
        </div>
      )}
    </div>
  );
}
