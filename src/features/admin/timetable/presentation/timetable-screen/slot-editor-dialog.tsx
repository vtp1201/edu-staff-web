"use client";

import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { ConflictInfo } from "../../domain/entities/timetable.entity";
import { findClass, TT_SUBJECTS, TT_TEACHERS } from "./timetable-static";

export interface SlotEditorTarget {
  day: number;
  period: number;
}

export interface SlotEditorInitial {
  subjectId: string;
  teacherId: string;
  room: string;
}

export interface SlotEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  target: SlotEditorTarget | null;
  /** The existing slot at the target, if filled. */
  initial: SlotEditorInitial | null;
  /** Day labels for the title (already localized by the screen). */
  dayLabel: string;
  /** School-wide conflicts — used to warn if a candidate teacher is busy. */
  conflicts: ConflictInfo[];
  submitting: boolean;
  onSave: (data: {
    subjectId: string;
    teacherId: string;
    room: string;
  }) => void;
  onClear: () => void;
}

export function SlotEditorDialog({
  open,
  onOpenChange,
  classId,
  target,
  initial,
  dayLabel,
  conflicts,
  submitting,
  onSave,
  onClear,
}: SlotEditorDialogProps) {
  const t = useTranslations("timetable.slotEditor");
  const tCommon = useTranslations("timetable");

  const subjectId_ = useId();
  const roomId = useId();
  const teacherGroupId = useId();

  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? "");
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? "");
  const [room, setRoom] = useState(initial?.room ?? "");

  // Re-seed fields whenever the editor opens on a different slot.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-seed only on target/initial change
  useEffect(() => {
    setSubjectId(initial?.subjectId ?? "");
    setTeacherId(initial?.teacherId ?? "");
    setRoom(initial?.room ?? "");
  }, [target?.day, target?.period, classId]);

  // Reset teacher when subject changes away from the initial subject.
  const handleSubjectChange = (next: string) => {
    setSubjectId(next);
    if (next !== initial?.subjectId) setTeacherId("");
  };

  // Teacher list filtered to those teaching (subject) in (class) — ADR 0029.
  const availableTeachers = useMemo(() => {
    if (!subjectId) return [];
    return TT_TEACHERS.filter(
      (tch) => tch.subjectId === subjectId && tch.classIds.includes(classId),
    );
  }, [subjectId, classId]);

  // A candidate teacher is "busy" if a school-wide conflict already places them
  // at this (day, period) in another class.
  const busyTeacherIds = useMemo(() => {
    const set = new Set<string>();
    if (!target) return set;
    for (const c of conflicts) {
      if (c.day === target.day && c.period === target.period) {
        set.add(c.teacherId);
      }
    }
    return set;
  }, [conflicts, target]);

  const canSave = subjectId !== "" && teacherId !== "";

  const className = findClass(classId)?.name ?? classId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogDescription className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {tCommon("classLabel")} {className}
          </DialogDescription>
          <DialogTitle>
            {t("title")}: {dayLabel}
            {target ? ` — ${tCommon("periodN", { n: target.period })}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor={subjectId_}>
              {t("subject")} <span className="text-edu-error-text">*</span>
            </Label>
            <Select value={subjectId} onValueChange={handleSubjectChange}>
              <SelectTrigger id={subjectId_}>
                <SelectValue placeholder={t("subjectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TT_SUBJECTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label id={teacherGroupId}>
              {t("teacher")} <span className="text-edu-error-text">*</span>
            </Label>
            {!subjectId ? (
              <p className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Info className="size-3.5" aria-hidden />
                {t("pickSubjectFirst")}
              </p>
            ) : availableTeachers.length === 0 ? (
              <p className="flex items-center gap-2 rounded-md border border-edu-warning/40 bg-edu-warning/10 px-3 py-2 text-xs text-edu-warning-foreground">
                <AlertTriangle className="size-3.5" aria-hidden />
                {t("noEligibleTeacher")}
              </p>
            ) : (
              <fieldset
                className="flex flex-col gap-1.5 border-0 p-0"
                aria-labelledby={teacherGroupId}
              >
                {availableTeachers.map((tch) => {
                  const selected = tch.id === teacherId;
                  const busy = busyTeacherIds.has(tch.id);
                  return (
                    <label
                      key={tch.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-within:ring-2 focus-within:ring-ring",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      <input
                        type="radio"
                        name="timetable-teacher"
                        value={tch.id}
                        checked={selected}
                        onChange={() => setTeacherId(tch.id)}
                        className="sr-only"
                      />
                      <span className="flex-1 text-sm font-bold text-foreground">
                        {tch.name}
                      </span>
                      {busy ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-edu-warning-foreground">
                          <AlertTriangle className="size-3" aria-hidden />
                          {t("teacherBusy")}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </fieldset>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={roomId}>{t("room")}</Label>
            <Input
              id={roomId}
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder={t("roomPlaceholder")}
              maxLength={32}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {initial ? (
            <Button
              type="button"
              variant="outline"
              onClick={onClear}
              disabled={submitting}
              className="border-edu-error-text text-edu-error-text hover:bg-edu-error/10"
            >
              <Trash2 className="size-4" aria-hidden />
              {t("clear")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() =>
                onSave({ subjectId, teacherId, room: room.trim() })
              }
              disabled={!canSave || submitting}
            >
              {t("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
