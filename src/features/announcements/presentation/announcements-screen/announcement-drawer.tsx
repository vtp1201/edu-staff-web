"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import type {
  AnnouncementAudience,
  AnnouncementEntity,
  AnnouncementPriority,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../../domain/entities/announcement.entity";
import type { AnnouncementActionOutcome } from "./announcements-screen.i-vm";

const TITLE_MAX = 200;
const TITLE_MIN = 5;
const BODY_MAX = 2000;
const BODY_MIN = 10;
const GRADES = ["10", "11", "12"];

const AUDIENCES: AnnouncementAudience[] = [
  "all",
  "teachers",
  "parents",
  "students",
];
const PRIORITIES: AnnouncementPriority[] = ["normal", "important", "urgent"];

/** Static recipient estimate (mock) — mirrors the mock repo table. */
const ESTIMATE: Record<AnnouncementAudience, number> = {
  all: 1280,
  teachers: 42,
  parents: 768,
  students: 480,
};

function estimate(audience: AnnouncementAudience[]): number {
  if (audience.includes("all")) return ESTIMATE.all;
  return audience.reduce((s, a) => s + ESTIMATE[a], 0);
}

export interface AnnouncementDrawerProps {
  open: boolean;
  /** Non-null = editing a draft. */
  editing: AnnouncementEntity | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (
    input: CreateAnnouncementInput,
  ) => Promise<AnnouncementActionOutcome>;
  onUpdate: (
    input: UpdateAnnouncementInput,
  ) => Promise<AnnouncementActionOutcome>;
  onSuccess: () => void;
}

export function AnnouncementDrawer({
  open,
  editing,
  onOpenChange,
  onCreate,
  onUpdate,
  onSuccess,
}: AnnouncementDrawerProps) {
  const t = useTranslations("announcements");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience[]>(["all"]);
  const [grades, setGrades] = useState<string[]>([]);
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Seed from the editing draft when the drawer opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setBody(editing.body);
      setAudience(editing.audience.length ? editing.audience : ["all"]);
      setGrades(editing.gradeFilter);
      setPriority(editing.priority);
      setSendMode(editing.scheduledAt ? "scheduled" : "now");
      setScheduledAt(editing.scheduledAt ?? "");
    } else {
      setTitle("");
      setBody("");
      setAudience(["all"]);
      setGrades([]);
      setPriority("normal");
      setSendMode("now");
      setScheduledAt("");
    }
    setShowPreview(false);
  }, [open, editing]);

  const titleInvalid = title.trim().length < TITLE_MIN;
  const bodyInvalid = body.trim().length < BODY_MIN;
  const scheduleInvalid =
    sendMode === "scheduled" &&
    (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now());
  const canSubmit =
    !titleInvalid &&
    !bodyInvalid &&
    audience.length > 0 &&
    !scheduleInvalid &&
    !submitting;

  const recipientEstimate = useMemo(() => estimate(audience), [audience]);

  const toggleAudience = (a: AnnouncementAudience) => {
    setAudience((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };
  const toggleGrade = (g: string) => {
    setGrades((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  async function submit(mode: "now" | "scheduled" | "draft") {
    setSubmitting(true);
    const base = {
      title,
      body,
      priority,
      audience,
      gradeFilter: grades,
    };
    try {
      let res: AnnouncementActionOutcome;
      if (mode === "draft") {
        const input: UpdateAnnouncementInput = {
          ...base,
          id: editing?.id ?? `draft-${Date.now()}`,
          sendMode: sendMode === "scheduled" ? "scheduled" : "now",
          scheduledAt: sendMode === "scheduled" ? scheduledAt : null,
        };
        res = await onUpdate(input);
      } else {
        const input: CreateAnnouncementInput = {
          ...base,
          sendMode: mode,
          scheduledAt: mode === "scheduled" ? scheduledAt : null,
        };
        res = await onCreate(input);
      }
      if (res.ok) {
        toast.success(
          t(
            mode === "draft"
              ? "draftToast"
              : mode === "scheduled"
                ? "scheduleToast"
                : "sendToast",
          ),
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(t(`errors.${res.errorKey ?? "unknown"}` as const));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const titleId = "ann-title";
  const bodyId = "ann-body";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={t("btnClose")}
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-border border-b">
          <SheetTitle>
            {editing ? t("drawerEditTitle") : t("drawerCreateTitle")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("subtitle")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={titleId}>{t("fieldTitle")}</Label>
              <span className="text-edu-text-secondary text-xs">
                {t("charCount", { current: title.length, max: TITLE_MAX })}
              </span>
            </div>
            <Input
              id={titleId}
              value={title}
              maxLength={TITLE_MAX}
              placeholder={t("fieldTitlePlaceholder")}
              aria-invalid={titleInvalid}
              aria-describedby={titleInvalid ? `${titleId}-err` : undefined}
              onChange={(e) => setTitle(e.target.value)}
            />
            {titleInvalid && (
              <p id={`${titleId}-err`} className="text-edu-error-text text-xs">
                {t("errors.title-too-short")}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={bodyId}>{t("fieldBody")}</Label>
              <span className="text-edu-text-secondary text-xs">
                {t("charCount", { current: body.length, max: BODY_MAX })}
              </span>
            </div>
            <Textarea
              id={bodyId}
              value={body}
              maxLength={BODY_MAX}
              rows={5}
              placeholder={t("fieldBodyPlaceholder")}
              aria-invalid={bodyInvalid}
              aria-describedby={bodyInvalid ? `${bodyId}-err` : undefined}
              onChange={(e) => setBody(e.target.value)}
            />
            {bodyInvalid && (
              <p id={`${bodyId}-err`} className="text-edu-error-text text-xs">
                {t("errors.body-too-short")}
              </p>
            )}
          </div>

          {/* Audience */}
          <fieldset
            className="flex flex-col gap-2"
            aria-describedby={
              audience.length === 0 ? "ann-audience-err" : undefined
            }
          >
            <legend className="mb-1 font-medium text-sm">
              {t("fieldAudience")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => {
                const on = audience.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleAudience(a)}
                    className={cn(
                      "rounded-full px-3 py-1.5 font-medium text-sm transition-colors",
                      on
                        ? "bg-primary/12 text-edu-text-primary"
                        : "bg-muted text-foreground hover:bg-muted/70",
                    )}
                  >
                    {t(`audience${cap(a)}` as AudKey)}
                  </button>
                );
              })}
            </div>
            {audience.length === 0 && (
              <p
                id="ann-audience-err"
                role="alert"
                className="text-edu-error-text text-xs"
              >
                {t("errors.no-audience")}
              </p>
            )}
          </fieldset>

          {/* Grade filter */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium text-sm">
              {t("fieldGradeFilter")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => {
                const on = grades.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGrade(g)}
                    className={cn(
                      "rounded-full px-3 py-1.5 font-medium text-sm transition-colors",
                      on
                        ? "bg-primary/12 text-edu-text-primary"
                        : "bg-muted text-foreground hover:bg-muted/70",
                    )}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Recipient estimate */}
          <p className="rounded-[var(--edu-radius-btn)] bg-muted px-3 py-2 text-muted-foreground text-sm">
            {t("estimatedRecipients", { count: recipientEstimate })}
          </p>

          {/* Priority */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium text-sm">
              {t("fieldPriority")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <label
                  key={p}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[var(--edu-radius-btn)] border border-border px-3 py-1.5 text-sm",
                    priority === p && "border-primary bg-primary/8",
                  )}
                >
                  <input
                    type="radio"
                    name="priority"
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    className="accent-primary"
                  />
                  {t(`priority${cap(p)}` as PriKey)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Send mode */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium text-sm">
              {t("fieldSendMode")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {(["now", "scheduled"] as const).map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[var(--edu-radius-btn)] border border-border px-3 py-1.5 text-sm",
                    sendMode === m && "border-primary bg-primary/8",
                  )}
                >
                  <input
                    type="radio"
                    name="sendMode"
                    checked={sendMode === m}
                    onChange={() => setSendMode(m)}
                    className="accent-primary"
                  />
                  {t(m === "now" ? "sendModeNow" : "sendModeSchedule")}
                </label>
              ))}
            </div>
            {sendMode === "scheduled" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ann-sched">{t("fieldScheduledAt")}</Label>
                <Input
                  id="ann-sched"
                  type="datetime-local"
                  value={scheduledAt}
                  aria-invalid={scheduleInvalid}
                  aria-describedby={
                    scheduleInvalid ? "ann-sched-err" : undefined
                  }
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                {scheduleInvalid && (
                  <p id="ann-sched-err" className="text-edu-error-text text-xs">
                    {t("errors.schedule-past-date")}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {/* Preview */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-pressed={showPreview}
              onClick={() => setShowPreview((v) => !v)}
              className="self-start font-medium text-primary text-sm hover:underline"
            >
              {t("previewToggle")}
            </button>
            {showPreview && (
              <div className="rounded-[var(--edu-radius-card)] border border-border bg-background p-3">
                <p className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
                  {t("previewHeading")}
                </p>
                <p className="mt-1 font-bold text-card-foreground text-sm">
                  {title || t("fieldTitlePlaceholder")}
                </p>
                <p className="mt-1 line-clamp-3 text-muted-foreground text-sm">
                  {body || t("fieldBodyPlaceholder")}
                </p>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-border border-t">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("btnCancel")}
            </Button>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => submit("draft")}
            >
              {t("btnSaveDraft")}
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={() =>
                submit(sendMode === "scheduled" ? "scheduled" : "now")
              }
            >
              {sendMode === "scheduled" ? t("btnSchedule") : t("btnSendNow")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type AudKey =
  | "audienceAll"
  | "audienceTeachers"
  | "audienceParents"
  | "audienceStudents";
type PriKey = "priorityNormal" | "priorityImportant" | "priorityUrgent";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
