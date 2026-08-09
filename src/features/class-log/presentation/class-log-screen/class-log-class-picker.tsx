"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ClassOption {
  id: string;
  name: string;
}

/**
 * Class switcher for the class log. Same shape and mechanics as
 * `attendance-filters`' class dropdown (URL param → RSC refetch), so a teacher
 * with several classes never has to go back to a picker page to change class.
 * The caller mounts it only when there are ≥2 classes.
 */
export function ClassLogClassPicker({
  classes,
  classId,
}: {
  classes: ClassOption[];
  classId: string;
}) {
  const t = useTranslations("classLog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function select(next: string) {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set("classId", next);
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="class-log-class">{t("detail.classPickerLabel")}</Label>
      <Select value={classId} onValueChange={select}>
        <SelectTrigger id="class-log-class" className="min-w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
