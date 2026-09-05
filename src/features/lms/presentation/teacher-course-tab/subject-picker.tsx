"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubjectOptionVm } from "./teacher-course-tab.i-vm";

export interface SubjectPickerProps {
  options: SubjectOptionVm[];
  selectedId: string;
  /** NAVIGATION, not a fetch: the parent pushes a new `?subjectId=` and the
   *  RSC re-resolves the whole tab. */
  onSelect: (subjectId: string) => void;
}

/**
 * The GVCN's "which subject's course am I looking at" control.
 *
 * The teacher's OWN subject is marked in the option's visible text
 * ("(môn của bạn)") rather than by position or colour — the distinction decides
 * whether the timeline is editable, so it must survive a screen reader.
 *
 * `aria-label` on the trigger because the design has no visible `<label>`; the
 * Radix primitive supplies the combobox/listbox semantics and keyboard model.
 */
export function SubjectPicker({
  options,
  selectedId,
  onSelect,
}: SubjectPickerProps) {
  const t = useTranslations("courses.teacher.subjectPicker");

  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger
        aria-label={t("label")}
        className="h-11 w-full max-w-xs font-semibold text-[13px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.subjectId} value={option.subjectId}>
            {option.isMine ? t("mine", { name: option.name }) : option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
