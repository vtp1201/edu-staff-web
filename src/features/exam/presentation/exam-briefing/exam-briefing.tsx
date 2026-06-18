"use client";

import { Clock, FileText, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/shared/utils";
import type { ExamBriefingVm } from "./exam-briefing.i-vm";

const RULE_KEYS = ["rule1", "rule2", "rule3", "rule4", "rule5"] as const;

export function ExamBriefingScreen({ exam, onStart }: ExamBriefingVm) {
  const t = useTranslations("exam");
  const [agreed, setAgreed] = useState(false);
  const checkboxId = useId();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        <div className="bg-primary/10 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {exam.subjectName}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground">
            {exam.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("card.teacher", { name: exam.teacherName })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-6">
          <InfoChip
            icon={<Clock className="size-4 text-primary" aria-hidden="true" />}
            label={t("briefing.duration")}
            value={t("card.duration", { minutes: exam.durationMinutes })}
          />
          <InfoChip
            icon={
              <FileText className="size-4 text-primary" aria-hidden="true" />
            }
            label={t("briefing.questions")}
            value={String(exam.totalQuestions)}
          />
          <InfoChip
            icon={
              <ListChecks className="size-4 text-primary" aria-hidden="true" />
            }
            label={t("briefing.type")}
            value={t("briefing.typeValue")}
          />
        </div>
      </div>

      <section className="rounded-[var(--edu-radius-card)] border border-border bg-card p-6 shadow-card">
        <h2 className="text-base font-bold text-foreground">
          {t("briefing.rulesTitle")}
        </h2>
        <ol className="mt-3 space-y-2">
          {RULE_KEYS.map((key, i) => (
            <li key={key} className="flex gap-3 text-sm text-foreground">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5">{t(`briefing.rules.${key}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex items-start gap-3">
        <Checkbox
          id={checkboxId}
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5"
        />
        <label
          htmlFor={checkboxId}
          className="cursor-pointer text-sm text-foreground"
        >
          {t("briefing.agreeLabel")}
        </label>
      </div>

      <Button
        size="lg"
        className={cn("w-full")}
        disabled={!agreed}
        onClick={onStart}
      >
        {t("briefing.startCta")}
      </Button>
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--edu-radius-btn)] bg-muted/50 p-3 text-center">
      <div className="flex justify-center">{icon}</div>
      <div className="mt-1 text-xs text-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
