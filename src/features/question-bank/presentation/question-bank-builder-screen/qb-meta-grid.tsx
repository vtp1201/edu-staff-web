"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Difficulty } from "../../domain/entities/question.entity";
import type { SubjectOption } from "../shared.i-vm";

const DIFFICULTY_OPTIONS: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export interface QBMetaGridProps {
  subjectId: string;
  gradeLevel: string;
  difficulty: Difficulty;
  subjects: SubjectOption[];
  gradeOptions: string[];
  /** All 3 selects share one lock derivation (`isLocked || isEdit`, FR-009). */
  disabled: boolean;
  onSubjectChange: (id: string) => void;
  onGradeChange: (value: string) => void;
  onDifficultyChange: (value: Difficulty) => void;
  /** Already-translated inline error for the subject field (undefined = none). */
  subjectError?: string;
}

/**
 * Subject / grade / difficulty grid (design metaGrid: 1.4fr 1fr 1fr desktop,
 * stacks to 1 col on mobile). All three are immutable post-create (FR-009), so
 * `disabled` (not merely dimmed) on the edit route. `Label htmlFor` + `id`
 * pairing per field (NFR-002).
 */
export function QBMetaGrid({
  subjectId,
  gradeLevel,
  difficulty,
  subjects,
  gradeOptions,
  disabled,
  onSubjectChange,
  onGradeChange,
  onDifficultyChange,
  subjectError,
}: QBMetaGridProps) {
  const t = useTranslations("questionBank.builder");
  const tDiff = useTranslations("questionBank.difficulty");

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4.5 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <Label
          htmlFor="qb-subject"
          className="mb-1.5 block font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide"
        >
          {t("subjectLabel")}
        </Label>
        <Select
          value={subjectId}
          disabled={disabled}
          onValueChange={onSubjectChange}
        >
          <SelectTrigger id="qb-subject" className="w-full">
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
        {subjectError && (
          <p role="alert" className="mt-1.5 text-edu-error-text text-xs">
            {subjectError}
          </p>
        )}
      </div>

      <div>
        <Label
          htmlFor="qb-grade"
          className="mb-1.5 block font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide"
        >
          {t("gradeLevelLabel")}
        </Label>
        <Select
          value={gradeLevel}
          disabled={disabled}
          onValueChange={onGradeChange}
        >
          <SelectTrigger id="qb-grade" className="w-full">
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

      <div>
        <Label
          htmlFor="qb-difficulty"
          className="mb-1.5 block font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide"
        >
          {t("difficultyLabel")}
        </Label>
        <Select
          value={difficulty}
          disabled={disabled}
          onValueChange={(v) => onDifficultyChange(v as Difficulty)}
        >
          <SelectTrigger id="qb-difficulty" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTY_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {tDiff(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
