"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { TeacherMember } from "@/features/admin/class-management/domain/entities/teacher-member.entity";
import { cn } from "@/shared/utils";
import type { ClassActionResult } from "./class-management-screen.i-vm";

interface HomeroomPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Class | null;
  teachers: TeacherMember[];
  onAssign: (
    classId: string,
    teacherUserId: string,
  ) => Promise<ClassActionResult>;
}

export function HomeroomPickerSheet({
  open,
  onOpenChange,
  target,
  teachers,
  onAssign,
}: HomeroomPickerSheetProps) {
  const t = useTranslations("classManagement.homeroomSheet");
  const [search, setSearch] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((tch) => tch.displayName.toLowerCase().includes(q));
  }, [teachers, search]);

  const handleAssign = async (teacherUserId: string) => {
    if (!target) return;
    setSubmittingId(teacherUserId);
    const result = await onAssign(target.id, teacherUserId);
    setSubmittingId(null);
    if (result.ok) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          {target?.homeroomTeacherName ? (
            <p className="text-sm text-muted-foreground">
              {t("currentHomeroom")}:{" "}
              <span className="font-semibold text-foreground">
                {target.homeroomTeacherName}
              </span>
            </p>
          ) : null}

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("noTeachers")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {filtered.map((tch) => {
                const isCurrent = tch.userId === target?.homeroomTeacherId;
                return (
                  <li key={tch.userId}>
                    <button
                      type="button"
                      onClick={() => handleAssign(tch.userId)}
                      disabled={submittingId !== null}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-[var(--edu-radius-btn)] px-3 py-2 text-left text-sm transition-colors",
                        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isCurrent && "bg-primary/12",
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {tch.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tch.email}
                        </span>
                      </span>
                      {isCurrent ? (
                        <Check
                          aria-hidden="true"
                          className="size-4 text-primary"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-primary">
                          {t("assign")}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
