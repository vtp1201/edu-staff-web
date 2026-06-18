"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectorVM } from "../teaching-plan-screen.i-vm";

type Props = {
  selector: SelectorVM;
  onChange: (field: "subject" | "class" | "term", value: string) => void;
};

export function SubjectClassTermSelector({ selector, onChange }: Props) {
  const t = useTranslations("teachingPlan.selector");
  const subjectId = useId();
  const classId = useId();
  const termId = useId();

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex min-w-44 flex-col gap-1.5">
        <Label htmlFor={subjectId} className="text-xs">
          {t("subject")}
        </Label>
        <Select
          value={selector.selectedSubjectId || undefined}
          onValueChange={(v) => onChange("subject", v)}
        >
          <SelectTrigger id={subjectId}>
            <SelectValue placeholder={t("subjectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {selector.subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-36 flex-col gap-1.5">
        <Label htmlFor={classId} className="text-xs">
          {t("class")}
        </Label>
        <Select
          value={selector.selectedClassId || undefined}
          onValueChange={(v) => onChange("class", v)}
        >
          <SelectTrigger id={classId}>
            <SelectValue placeholder={t("classPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {selector.classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-36 flex-col gap-1.5">
        <Label htmlFor={termId} className="text-xs">
          {t("term")}
        </Label>
        <Select
          value={selector.selectedTerm || undefined}
          onValueChange={(v) => onChange("term", v)}
        >
          <SelectTrigger id={termId}>
            <SelectValue placeholder={t("termPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {selector.terms.map((term) => (
              <SelectItem key={term} value={term}>
                {term}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
