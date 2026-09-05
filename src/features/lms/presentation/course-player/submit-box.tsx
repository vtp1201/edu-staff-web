"use client";

import { AlertTriangle, Check, RotateCw, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useReducer } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { SubmissionVm, SubmitAssignmentFn } from "./course-player.i-vm";
import { SubmittedBanner } from "./submitted-banner";

/** BE's own cap (`LMS_SUBMISSION_CONTENT_TOO_LONG`), mirrored as a UX guard —
 *  NOT a security boundary: the Server Action forwards `content` untouched and
 *  lets BE refuse anything longer. */
export const MAX_CONTENT_LENGTH = 20000;

type Status =
  | "idle" // nothing worth submitting yet
  | "ready" // valid text and/or link
  | "confirming" // the one-way warning is on screen; NO request sent yet
  | "submitting"
  | "submitted" // terminal
  | "error";

interface State {
  text: string;
  link: string;
  /** Only show the link error once the student has left it in a bad state. */
  linkTouched: boolean;
  status: Status;
  errorKey: LmsFailure["type"] | null;
  /** The SERVER's submission (200 body, or the 409 re-read) — never local. */
  submission: SubmissionVm | null;
}

type Action =
  | { type: "edit-text"; value: string }
  | { type: "edit-link"; value: string }
  | { type: "blur-link" }
  | { type: "request-confirm" }
  | { type: "cancel-confirm" }
  | { type: "start-submit" }
  | { type: "succeeded"; submission: SubmissionVm }
  | {
      type: "failed";
      errorKey: LmsFailure["type"];
      submission: SubmissionVm | null;
    };

/** Empty is fine (the field is optional); anything else must be a real
 *  http(s) URL — a bare "drive.google.com" would submit a dead reference. */
export function isLinkValid(link: string): boolean {
  const value = link.trim();
  if (value === "") return true;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function canSubmit(state: Pick<State, "text" | "link">): boolean {
  const hasContent = state.text.trim() !== "" || state.link.trim() !== "";
  return hasContent && isLinkValid(state.link);
}

/** BE accepts ONE `content` string — the link rides along as its last line. */
export function composeContent(text: string, link: string): string {
  return [text.trim(), link.trim()].filter((part) => part !== "").join("\n");
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "edit-text":
    case "edit-link": {
      // Editing is only possible from the two pre-request states, so a
      // keystroke can never reopen a submitted box.
      if (state.status !== "idle" && state.status !== "ready") return state;
      const next =
        action.type === "edit-text"
          ? { ...state, text: action.value }
          : { ...state, link: action.value };
      return { ...next, status: canSubmit(next) ? "ready" : "idle" };
    }
    case "blur-link":
      return { ...state, linkTouched: true };
    case "request-confirm":
      // The ONLY path to a request starts here, and only from `ready`.
      return state.status === "ready"
        ? { ...state, status: "confirming" }
        : state;
    case "cancel-confirm":
      return state.status === "confirming"
        ? { ...state, status: "ready", errorKey: null }
        : state;
    case "start-submit":
      return state.status === "confirming" || state.status === "error"
        ? { ...state, status: "submitting", errorKey: null }
        : state;
    case "succeeded":
      return { ...state, status: "submitted", submission: action.submission };
    case "failed":
      // A 409 that came back WITH the real submission is not an error state to
      // the student: their work is on the server, so show it as submitted.
      return action.submission
        ? {
            ...state,
            status: "submitted",
            submission: action.submission,
            errorKey: null,
          }
        : { ...state, status: "error", errorKey: action.errorKey };
    default:
      return state;
  }
}

const INITIAL: State = {
  text: "",
  link: "",
  linkTouched: false,
  status: "idle",
  errorKey: null,
  submission: null,
};

export interface SubmitBoxProps {
  assignmentId: string;
  onSubmit: SubmitAssignmentFn;
}

/**
 * The one-way submit (US-E24.5, high-risk lane).
 *
 * Two-step by construction: "Nộp bài" only moves local state to `confirming`;
 * the Server Action is called from the confirm step alone. The warning is a
 * real render state (keyboard-reachable, announced through `role="status"`),
 * never `window.confirm()`.
 *
 * There is deliberately NO optimistic update: both realistic failures (a 409
 * race, a network error) need the UI to show something different from
 * "submitted", and rolling BACK a submitted banner is a worse lie than a
 * two-second "Đang nộp bài…". The success banner always renders the SERVER's
 * submission — on the 409 path that is the other tab's work, re-read
 * server-side, not the text sitting in this textarea.
 */
export function SubmitBox({ assignmentId, onSubmit }: SubmitBoxProps) {
  const t = useTranslations("courses.player");
  const tErrors = useTranslations("courses.errors");
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Deterministic (no `useId`): exactly one submit box exists per page, and a
  // stable id keeps the label/aria wiring identical between server and client.
  const baseId = `submit-${assignmentId}`;
  const textId = `${baseId}-text`;
  const counterId = `${baseId}-counter`;
  const hintId = `${baseId}-hint`;
  const linkId = `${baseId}-link`;
  const linkErrorId = `${baseId}-link-error`;

  const linkInvalid = state.linkTouched && !isLinkValid(state.link);
  const frozen = state.status === "confirming" || state.status === "submitting";

  async function send() {
    dispatch({ type: "start-submit" });
    const result = await onSubmit(composeContent(state.text, state.link));
    if (result.ok) {
      dispatch({ type: "succeeded", submission: result.submission });
      return;
    }
    if (result.errorKey === "already-submitted") {
      toast.error(t("submit.alreadySubmittedToast"));
      dispatch({
        type: "failed",
        errorKey: "already-submitted",
        submission: result.submission,
      });
      return;
    }
    dispatch({ type: "failed", errorKey: result.errorKey, submission: null });
  }

  if (state.status === "submitted" && state.submission) {
    return <SubmittedBanner submission={state.submission} />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <Label
            htmlFor={textId}
            className="font-extrabold text-[11px] text-muted-foreground uppercase tracking-[0.06em]"
          >
            {t("submit.answerLabel")}
          </Label>
          <span
            id={counterId}
            className="text-[11px] text-muted-foreground tabular-nums"
          >
            {t("submit.counter", {
              count: state.text.length,
              max: MAX_CONTENT_LENGTH,
            })}
          </span>
        </div>
        <Textarea
          id={textId}
          rows={5}
          value={state.text}
          maxLength={MAX_CONTENT_LENGTH}
          disabled={frozen}
          aria-describedby={`${counterId} ${hintId}`}
          placeholder={t("submit.answerPlaceholder")}
          onChange={(event) =>
            dispatch({ type: "edit-text", value: event.target.value })
          }
        />
      </div>

      <div>
        <Label
          htmlFor={linkId}
          className="mb-1.5 font-extrabold text-[11px] text-muted-foreground uppercase tracking-[0.06em]"
        >
          {t("submit.linkLabel")}
        </Label>
        <Input
          id={linkId}
          type="url"
          inputMode="url"
          value={state.link}
          disabled={frozen}
          aria-invalid={linkInvalid}
          aria-describedby={linkInvalid ? linkErrorId : undefined}
          placeholder={t("submit.linkPlaceholder")}
          onBlur={() => dispatch({ type: "blur-link" })}
          onChange={(event) =>
            dispatch({ type: "edit-link", value: event.target.value })
          }
        />
        {linkInvalid && (
          <p id={linkErrorId} className="mt-1 text-edu-error-text text-xs">
            {t("submit.linkInvalid")}
          </p>
        )}
      </div>

      {state.status === "confirming" ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2.5 rounded-[9px] bg-edu-warning-light px-3 py-2.5"
        >
          <AlertTriangle
            className="size-3.5 shrink-0 text-edu-warning-text"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 basis-40 font-bold text-edu-warning-text text-xs">
            {t("submit.confirmWarning")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: "cancel-confirm" })}
          >
            {t("submit.reviewButton")}
          </Button>
          <Button type="button" size="sm" onClick={() => void send()}>
            {t("submit.confirmButton")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            disabled={state.status !== "ready"}
            onClick={() => dispatch({ type: "request-confirm" })}
          >
            <Check strokeWidth={2.4} aria-hidden="true" />
            {t("submit.submitButton")}
          </Button>
          <p id={hintId} className="text-[11px] text-muted-foreground">
            {state.status === "idle" ? t("submit.emptyHint") : t("submit.hint")}
          </p>
        </div>
      )}

      {state.status === "submitting" && (
        <p role="status" className="font-semibold text-primary text-xs">
          {t("submit.submitting")}
        </p>
      )}

      {state.status === "error" && state.errorKey !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2.5 rounded-[9px] border border-edu-error/40 bg-edu-error-light px-3 py-2.5"
        >
          <p className="min-w-0 flex-1 basis-40 font-semibold text-edu-error-text text-xs">
            {tErrors(state.errorKey)}
          </p>
          {/* A deadline and a duplicate submission are both final — offering
              "Thử lại" there would invite the student to bang on a door BE has
              already locked. */}
          {state.errorKey !== "closed" &&
            state.errorKey !== "already-submitted" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void send()}
              >
                <RotateCw strokeWidth={2.2} aria-hidden="true" />
                {t("submit.retryButton")}
              </Button>
            )}
        </div>
      )}

      {/* D3 / ask #1: file upload has no BE endpoint yet. Shown DISABLED with
          the reason spelled out, so the missing capability is honest rather
          than a button that fails on click. */}
      <div
        aria-disabled="true"
        className="flex flex-wrap items-center gap-2 rounded-[10px] border border-border border-dashed px-3.5 py-2.5 opacity-70"
      >
        <Upload
          className="size-3.5 text-muted-foreground"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="font-bold text-edu-text-secondary text-xs">
          {t("submit.attachmentsLabel")}
        </span>
        <Badge variant="secondary">{t("submit.attachmentsBadge")}</Badge>
      </div>
    </div>
  );
}
