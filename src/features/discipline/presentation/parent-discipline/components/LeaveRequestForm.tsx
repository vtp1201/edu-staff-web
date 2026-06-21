"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  LeaveType,
  SubmitChildLeaveRequestInput,
} from "../../../domain/entities/leave-request.entity";
import type { DisciplineFailure } from "../../../domain/failures/discipline.failure";

const LEAVE_TYPES: LeaveType[] = ["medical", "personal", "event", "other"];

/** Local date ISO "YYYY-MM-DD" (no timezone shift) — drives the date input min. */
function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type LeaveFormValues = {
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason: string;
};

/**
 * Inline (non-Sheet) leave request form for the parent view (US-E09.4). Toggled
 * open by a CTA button; on open focuses startDate, on close returns focus to the
 * CTA. parentId/submittedBy are NEVER included — the server derives them.
 */
export function LeaveRequestForm({
  childId,
  submitAction,
  onSubmitted,
}: {
  childId: string;
  submitAction: (
    childId: string,
    input: SubmitChildLeaveRequestInput,
  ) => Promise<{ errorKey?: DisciplineFailure["type"] }>;
  /** Called with the submitted input on success (for optimistic update + banner). */
  onSubmitted: (input: SubmitChildLeaveRequestInput) => void;
}) {
  const t = useTranslations("discipline.studentConduct.leaveRequest");
  const tErr = useTranslations("discipline.errors");
  const tCommon = useTranslations("discipline.violations");
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [serverErrorKey, setServerErrorKey] = useState<
    DisciplineFailure["type"] | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const formErrorId = useId();
  const ctaRef = useRef<HTMLButtonElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);

  const schema = z
    .object({
      startDate: z
        .string()
        .min(1)
        .refine((d) => d >= today, { message: tErr("invalid-date") }),
      endDate: z.string().min(1),
      type: z.enum(["medical", "personal", "event", "other"]),
      reason: z
        .string()
        .trim()
        .min(10, { message: tErr("reason-too-short") }),
    })
    .refine((v) => v.endDate >= v.startDate, {
      message: tErr("invalid-date"),
      path: ["endDate"],
    });

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: today,
      endDate: today,
      type: "medical",
      reason: "",
    },
  });

  // Reset form + close when the active child changes (AC-02-04).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on childId change only
  useEffect(() => {
    setOpen(false);
    setServerErrorKey(null);
    form.reset();
  }, [childId]);

  // Focus management: open → startDate, close → CTA (AC-03 a11y).
  useEffect(() => {
    if (open) {
      startDateRef.current?.focus();
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    form.reset();
    ctaRef.current?.focus();
  };

  const onSubmit = (values: LeaveFormValues) => {
    setServerErrorKey(null);
    const input: SubmitChildLeaveRequestInput = {
      startDate: values.startDate,
      endDate: values.endDate,
      type: values.type,
      reason: values.reason.trim(),
    };
    startTransition(async () => {
      const res = await submitAction(childId, input);
      if (res.errorKey) {
        setServerErrorKey(res.errorKey);
        return;
      }
      onSubmitted(input);
      form.reset();
      setOpen(false);
      ctaRef.current?.focus();
    });
  };

  if (!open) {
    return (
      <Button ref={ctaRef} type="button" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" aria-hidden="true" />
        {t("button")}
      </Button>
    );
  }

  const startDateField = form.register("startDate");

  return (
    <section
      className="rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card"
      aria-labelledby="leave-form-heading"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="leave-form-heading"
          className="font-bold text-foreground text-sm"
        >
          {t("title")}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("close")}
          onClick={close}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, () => {
            const firstError = (
              Object.keys(form.formState.errors) as Array<keyof LeaveFormValues>
            )[0];
            if (firstError) form.setFocus(firstError);
          })}
          className="flex flex-col gap-4"
          aria-describedby={serverErrorKey ? formErrorId : undefined}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("startDate")}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={today}
                      {...field}
                      ref={(el) => {
                        startDateField.ref(el);
                        startDateRef.current = el;
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("endDate")}</FormLabel>
                  <FormControl>
                    <Input type="date" min={today} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("type")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LEAVE_TYPES.map((lt) => (
                      <SelectItem key={lt} value={lt}>
                        {t(`types.${lt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reason")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder={t("reasonPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {serverErrorKey && (
            <p
              id={formErrorId}
              role="alert"
              className="rounded-md border border-edu-error/20 bg-edu-error/10 px-3 py-2 text-edu-error-text text-sm"
            >
              {tErr(serverErrorKey)}
            </p>
          )}

          <div className="flex flex-row gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? t("submitting") : t("submit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={close}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
