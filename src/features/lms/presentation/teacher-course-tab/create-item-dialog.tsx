"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isDueAfterStart,
  isHttpsUrl,
  toIsoInstant,
} from "@/features/lms/domain/use-cases/validate-item-window";
import type { AddItemKind } from "../course-timeline/course-timeline.i-vm";

export interface CreateItemValues {
  title: string;
  /** LESSON only. */
  content: string;
  /** ASSIGNMENT only. */
  instructions: string;
  /** DOCUMENT only. */
  url: string;
  startAt: string | null;
  dueAt: string | null;
}

export interface CreateItemDialogProps {
  /** `null` = closed. The kind IS the open state — there is no separate flag to
   *  drift out of sync with it. */
  kind: AddItemKind | null;
  /** `datetime-local` value seeded from the week whose pill was used. */
  suggestedStartAt: string;
  isSubmitting: boolean;
  /** Already-i18n'd failure from the last submit; the dialog stays open. */
  submitError: string | null;
  onSubmit: (kind: AddItemKind, values: CreateItemValues) => void;
  onCancel: () => void;
}

const TITLE_KEY = {
  lesson: "lessonTitle",
  assignment: "assignmentTitle",
  document: "documentTitle",
} as const;

/**
 * ONE dialog parameterized by `kind`, not three — the three field sets differ
 * by a single block each, and three copies would drift on the next spacing or
 * a11y fix (decision `0026`).
 *
 * The parent MUST mount this with a `key` that changes per open (kind + week):
 * the form fields seed `useState` from `suggestedStartAt`, so a re-open for a
 * different week would otherwise reuse the previous week's date.
 *
 * Client-side validation covers exactly the two rules whose message must land
 * on a FIELD (`https` url, due-after-start). Everything else is BE's answer,
 * rendered as the dialog-level error while the dialog stays open.
 */
export function CreateItemDialog({
  kind,
  suggestedStartAt,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
}: CreateItemDialogProps) {
  const t = useTranslations("courses.teacher.createDialog");
  const tErr = useTranslations("courses.teacher.errors");
  const ids = useId();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [start, setStart] = useState(suggestedStartAt);
  const [due, setDue] = useState("");
  const [fieldError, setFieldError] = useState<{
    field: "title" | "body" | "url" | "window";
    message: string;
  } | null>(null);

  if (kind === null) return null;

  function reset() {
    setTitle("");
    setBody("");
    setUrl("");
    setStart(suggestedStartAt);
    setDue("");
    setFieldError(null);
  }

  function cancel() {
    reset();
    onCancel();
  }

  function submit() {
    if (kind === null) return;
    if (title.trim() === "") {
      setFieldError({ field: "title", message: tErr("titleRequired") });
      return;
    }
    // BE requires a lesson body (min 1 rune) — an empty one is a 422 round trip
    // whose message would arrive detached from the field that caused it.
    if (kind === "lesson" && body.trim() === "") {
      setFieldError({ field: "body", message: tErr("contentRequired") });
      return;
    }
    if (kind === "document" && !isHttpsUrl(url)) {
      setFieldError({ field: "url", message: tErr("invalidUrl") });
      return;
    }
    const startAt = toIsoInstant(start);
    const dueAt = toIsoInstant(due);
    if (!isDueAfterStart(startAt, dueAt)) {
      setFieldError({ field: "window", message: tErr("invalidWindow") });
      return;
    }
    setFieldError(null);
    onSubmit(kind, {
      title: title.trim(),
      content: body.trim(),
      instructions: body.trim(),
      url: url.trim(),
      startAt,
      dueAt,
    });
  }

  const errorFor = (field: NonNullable<typeof fieldError>["field"]) =>
    fieldError?.field === field ? fieldError.message : null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      {/* No `DialogDescription`: the fields ARE the description, and a
          restated title would only add noise to the announcement. */}
      <DialogContent aria-describedby={undefined} className="[&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{t(TITLE_KEY[kind])}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field
            id={`${ids}-title`}
            label={t("titleField")}
            error={errorFor("title")}
          >
            {(props) => (
              <Input
                {...props}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldError(null);
                }}
                className="h-11"
              />
            )}
          </Field>

          {kind === "lesson" && (
            <Field
              id={`${ids}-content`}
              label={t("contentField")}
              error={errorFor("body")}
            >
              {(props) => (
                <Textarea
                  {...props}
                  value={body}
                  rows={5}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setFieldError(null);
                  }}
                />
              )}
            </Field>
          )}

          {kind === "assignment" && (
            <Field id={`${ids}-instructions`} label={t("descriptionField")}>
              {(props) => (
                <Textarea
                  {...props}
                  value={body}
                  rows={4}
                  onChange={(e) => setBody(e.target.value)}
                />
              )}
            </Field>
          )}

          {kind === "document" && (
            <Field
              id={`${ids}-url`}
              label={t("urlField")}
              error={errorFor("url")}
            >
              {(props) => (
                <Input
                  {...props}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setFieldError(null);
                  }}
                  className="h-11"
                />
              )}
            </Field>
          )}

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[10rem] flex-1">
              <Field
                id={`${ids}-start`}
                label={t("opensField")}
                error={errorFor("window")}
              >
                {(props) => (
                  <Input
                    {...props}
                    type="datetime-local"
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      setFieldError(null);
                    }}
                    className="h-11"
                  />
                )}
              </Field>
            </div>
            <div className="min-w-[10rem] flex-1">
              <Field id={`${ids}-due`} label={t("dueField")}>
                {(props) => (
                  <Input
                    {...props}
                    type="datetime-local"
                    value={due}
                    aria-invalid={fieldError?.field === "window"}
                    onChange={(e) => {
                      setDue(e.target.value);
                      setFieldError(null);
                    }}
                    className="h-11"
                  />
                )}
              </Field>
            </div>
          </div>

          {submitError && (
            <p
              role="alert"
              className="font-semibold text-[12px] text-edu-error-text"
            >
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          {/* Plain buttons, not `DialogClose` — the cancel path must run the
              same reset the Escape path does, exactly once. */}
          <Button
            type="button"
            variant="outline"
            onClick={cancel}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Label + control + error text, wired with `htmlFor`/`aria-invalid`/
 *  `aria-describedby`. Local to this dialog: it exists only to stop the same
 *  four attributes being re-typed for each of the six fields. */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label
        htmlFor={id}
        className="font-bold text-[11px] text-muted-foreground uppercase tracking-[0.06em]"
      >
        {label}
      </Label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
      })}
      {error && (
        <p
          id={errorId}
          className="font-semibold text-[12px] text-edu-error-text"
        >
          {error}
        </p>
      )}
    </div>
  );
}
