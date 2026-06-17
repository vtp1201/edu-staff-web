"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  LeaveType,
  SubmitLeaveRequestInput,
} from "../../../domain/entities/leave-request.entity";
import type { DisciplineFailure } from "../../../domain/failures/discipline.failure";
import type { StudentConductActionResult } from "../student-conduct-screen.i-vm";

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

export function LeaveRequestSheet({
  studentId,
  submittedBy,
  submitAction,
  onSubmitted,
}: {
  studentId: string;
  submittedBy: "student" | "parent";
  submitAction: (
    input: SubmitLeaveRequestInput,
  ) => Promise<StudentConductActionResult>;
  /** Called with the submitted input on success so the parent can optimistically update. */
  onSubmitted?: (input: SubmitLeaveRequestInput) => void;
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

  const schema = z
    .object({
      startDate: z
        .string()
        .min(1)
        .refine((d) => d >= today, {
          message: tErr("invalid-date"),
        }),
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

  const onSubmit = (values: LeaveFormValues) => {
    setServerErrorKey(null);
    const input: SubmitLeaveRequestInput = {
      studentId,
      startDate: values.startDate,
      endDate: values.endDate,
      type: values.type,
      reason: values.reason.trim(),
      submittedBy,
    };
    startTransition(async () => {
      const res = await submitAction(input);
      if (res.errorKey) {
        setServerErrorKey(res.errorKey);
        return;
      }
      toast.success(t("success"));
      onSubmitted?.(input);
      form.reset();
      setOpen(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button">
          <CalendarPlus className="size-4" aria-hidden="true" />
          {t("button")}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("reasonPlaceholder")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 py-2"
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
                      <Input type="date" min={today} {...field} />
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

            <SheetFooter className="flex-row gap-2 px-0">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? t("submitting") : t("submit")}
              </Button>
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  {tCommon("cancel")}
                </Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
