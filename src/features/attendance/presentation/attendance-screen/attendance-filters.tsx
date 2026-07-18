"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassSummary } from "../../domain/repositories/i-attendance.repository";

type Props = {
  classes: ClassSummary[];
  classId?: string;
  date?: string;
};

export function AttendanceFilters({ classes, classId, date }: Props) {
  const t = useTranslations("attendance.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  function update(key: "class" | "date", value: string) {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) sp.set(key, value);
    else sp.delete(key);
    if (key === "class" && !sp.get("date")) sp.set("date", today);
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="att-class">{t("class")}</Label>
        <Select value={classId ?? ""} onValueChange={(v) => update("class", v)}>
          <SelectTrigger id="att-class">
            <SelectValue placeholder={t("selectClass")} />
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

      <div className="space-y-1.5">
        <Label htmlFor="att-date">{t("date")}</Label>
        <Input
          id="att-date"
          type="date"
          value={date ?? ""}
          onChange={(e) => update("date", e.target.value)}
        />
      </div>
    </div>
  );
}
