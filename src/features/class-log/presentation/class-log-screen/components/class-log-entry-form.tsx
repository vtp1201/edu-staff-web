"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ClassLogFormValues = {
  entryDate: string;
  summary: string;
  notableEvents: string;
};

type Props = {
  isPending: boolean;
  onBack: () => void;
  /** asDraft=true → save draft; false → create then submit. */
  onSave: (values: ClassLogFormValues, asDraft: boolean) => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ClassLogEntryForm({ isPending, onBack, onSave }: Props) {
  const t = useTranslations("classLog");
  const dateId = useId();
  const summaryId = useId();
  const summaryErrId = useId();
  const notesId = useId();

  const [entryDate, setEntryDate] = useState(today());
  const [summary, setSummary] = useState("");
  const [notableEvents, setNotableEvents] = useState("");
  const [showError, setShowError] = useState(false);

  const summaryInvalid = showError && summary.trim().length === 0;

  const handle = (asDraft: boolean) => {
    if (summary.trim().length === 0) {
      setShowError(true);
      return;
    }
    onSave({ entryDate, summary, notableEvents }, asDraft);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        autoFocus
        className="self-start text-edu-text-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={onBack}
      >
        <ChevronLeft className="size-3.5" aria-hidden="true" />
        {t("form.back")}
      </Button>

      <div className="rounded-[var(--edu-radius-card)] border border-border bg-card p-6 shadow-card sm:p-7">
        <h2 className="font-extrabold text-card-foreground text-lg">
          {t("form.title")}
        </h2>
        <p className="mt-1 text-edu-text-secondary text-xs">
          {t("form.subtitle")}
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={dateId}>{t("form.entryDate")}</Label>
            <Input
              id={dateId}
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={summaryId}>
              {t("form.summary")}{" "}
              <span aria-hidden="true" className="text-edu-error">
                *
              </span>
            </Label>
            <Textarea
              id={summaryId}
              rows={3}
              required
              aria-required="true"
              aria-invalid={summaryInvalid}
              aria-describedby={summaryInvalid ? summaryErrId : undefined}
              placeholder={t("form.summaryPlaceholder")}
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (showError) setShowError(false);
              }}
            />
            {summaryInvalid && (
              <p id={summaryErrId} className="text-edu-error-text text-xs">
                {t("form.summaryRequired")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={notesId}>{t("form.notableEvents")}</Label>
            <Textarea
              id={notesId}
              rows={3}
              placeholder={t("form.notableEventsPlaceholder")}
              value={notableEvents}
              onChange={(e) => setNotableEvents(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handle(true)}
            >
              {t("form.saveDraft")}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => handle(false)}
            >
              {isPending ? t("form.submitting") : t("form.submit")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
