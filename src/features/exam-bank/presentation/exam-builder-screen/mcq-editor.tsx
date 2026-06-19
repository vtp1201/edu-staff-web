"use client";

import { FileQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import type {
  ExamBankOption,
  ExamBankQuestion,
  ExamDifficulty,
} from "../../domain/entities/exam-bank-question.entity";
import type { QuestionFailureType } from "../../domain/use-cases/validate-questions";

const DIFFICULTIES: ExamDifficulty[] = ["easy", "medium", "hard"];

type McqEditorProps = {
  question: ExamBankQuestion | null;
  error: QuestionFailureType | null;
  onChange: (patch: Partial<ExamBankQuestion>) => void;
};

export function McqEditor({ question, error, onChange }: McqEditorProps) {
  const t = useTranslations("examBank");

  if (!question) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <FileQuestion
          className="size-10 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-muted-foreground text-sm">
          {t("builder.noSelection")}
        </p>
      </div>
    );
  }

  const contentInvalid = error === "question-empty-content";
  const answerInvalid = error === "question-missing-answer";
  const optionsInvalid = error === "insufficient-options";

  function handleOptionText(optionId: ExamBankOption["id"], text: string) {
    if (!question) return;
    onChange({
      options: question.options.map((o) =>
        o.id === optionId ? { ...o, text } : o,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Question content */}
      <div className="space-y-1.5">
        <Label htmlFor="mcq-content">{t("builder.contentLabel")}</Label>
        <Textarea
          id="mcq-content"
          rows={3}
          value={question.content}
          placeholder={t("builder.contentPlaceholder")}
          onChange={(e) => onChange({ content: e.target.value })}
          aria-invalid={contentInvalid}
          aria-describedby={contentInvalid ? "mcq-content-error" : undefined}
        />
        {contentInvalid && (
          <p id="mcq-content-error" className="text-edu-error-text text-xs">
            {t("errors.question-empty-content")}
          </p>
        )}
      </div>

      {/* Options + correct answer */}
      <fieldset className="space-y-2">
        <legend className="font-bold text-muted-foreground text-xs uppercase tracking-wide">
          {t("builder.optionsLabel")}
        </legend>
        <RadioGroup
          value={question.correctOptionId}
          onValueChange={(v) => onChange({ correctOptionId: v })}
          aria-label={t("builder.correctAnswerAriaLabel")}
          aria-invalid={answerInvalid || undefined}
          aria-describedby={answerInvalid ? "mcq-answer-error" : undefined}
        >
          {question.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-3">
              <RadioGroupItem
                value={opt.id}
                id={`mcq-correct-${opt.id}`}
                aria-label={t("builder.correctOptionAriaLabel", {
                  option: opt.id,
                })}
              />
              <Label
                htmlFor={`mcq-option-${opt.id}`}
                className="w-6 shrink-0 font-bold text-foreground text-sm"
              >
                {opt.id}
              </Label>
              <Input
                id={`mcq-option-${opt.id}`}
                value={opt.text}
                placeholder={t("builder.optionPlaceholder", { option: opt.id })}
                onChange={(e) => handleOptionText(opt.id, e.target.value)}
                aria-invalid={optionsInvalid || undefined}
                aria-describedby={
                  optionsInvalid ? "mcq-options-error" : undefined
                }
                className={cn(optionsInvalid && "border-edu-error")}
              />
            </div>
          ))}
        </RadioGroup>
        {answerInvalid && (
          <p id="mcq-answer-error" className="text-edu-error-text text-xs">
            {t("errors.question-missing-answer")}
          </p>
        )}
        {optionsInvalid && (
          <p id="mcq-options-error" className="text-edu-error-text text-xs">
            {t("errors.insufficient-options")}
          </p>
        )}
      </fieldset>

      {/* Difficulty */}
      <div className="space-y-1.5">
        <Label htmlFor="mcq-difficulty">{t("builder.difficultyLabel")}</Label>
        <Select
          value={question.difficulty}
          onValueChange={(v) => onChange({ difficulty: v as ExamDifficulty })}
        >
          <SelectTrigger id="mcq-difficulty" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {t(`difficulty.${d}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
