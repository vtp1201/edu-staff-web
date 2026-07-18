"use client";

import { AlertTriangle } from "lucide-react";
import { useId } from "react";
import { TagChipsInput } from "@/components/shared/tag-chips-input/tag-chips-input";
import type { InvitationFailure } from "../../domain/failures/invitation.failure";

/** RFC-5322-lite email check (same shape as the design mockup's `INV_EMAIL_RE`). */
export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

export interface InvitationEmailChipsInputLabels {
  fieldLabel: string;
  placeholder: string;
  helper: string;
  invalidError: string;
  duplicateError: string;
  inputAriaLabel: string;
  maxTagsHelper: string;
  tagTooLongError: string;
  removeAriaLabelOf: (email: string) => string;
}

export interface InvitationEmailChipsInputProps {
  emails: string[];
  serverRejectedEmails?: Record<string, InvitationFailure["type"]>;
  maxBatchEmails: number;
  labels: InvitationEmailChipsInputLabels;
  onChange: (emails: string[]) => void;
}

/**
 * Thin wrapper over the shared `TagChipsInput` (extended in US-E21.1 with the
 * optional `validate` prop). A chip is invalid if it fails the email format OR
 * the server rejected it post-submit (duplicate-in-tenant, AC-003.10). Renders
 * the aggregate `role="alert"` error line + helper below the input.
 */
export function InvitationEmailChipsInput({
  emails,
  serverRejectedEmails,
  maxBatchEmails,
  labels,
  onChange,
}: InvitationEmailChipsInputProps) {
  const labelId = useId();
  const errorId = useId();
  const rejected = serverRejectedEmails ?? {};

  const isRejected = (email: string) =>
    rejected[email.toLowerCase()] !== undefined ||
    rejected[email] !== undefined;

  const validate = (email: string) => isValidEmail(email) && !isRejected(email);

  const hasFormatInvalid = emails.some((e) => !isValidEmail(e));
  const hasRejected = emails.some((e) => isRejected(e));

  return (
    <div>
      {/* Not a <label>: the input lives inside TagChipsInput and is linked via
          aria-labelledby → this id, so a plain element is the correct control
          association here. */}
      <span
        id={labelId}
        className="mb-1.5 block font-bold text-edu-text-secondary text-xs"
      >
        {labels.fieldLabel}
      </span>
      <TagChipsInput
        tags={emails}
        onChange={onChange}
        isLocked={false}
        maxTags={maxBatchEmails}
        maxTagLength={254}
        validate={validate}
        labelledBy={labelId}
        invalidDescribedBy={
          hasFormatInvalid || hasRejected ? errorId : undefined
        }
        labels={{
          placeholder: labels.placeholder,
          inputAriaLabel: labels.inputAriaLabel,
          maxTagsHelper: labels.maxTagsHelper,
          tagTooLongError: labels.tagTooLongError,
          removeAriaLabelOf: labels.removeAriaLabelOf,
        }}
      />
      {hasFormatInvalid || hasRejected ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 font-bold text-edu-error-dark text-xs"
        >
          <AlertTriangle className="size-3" aria-hidden="true" />
          {hasFormatInvalid ? labels.invalidError : labels.duplicateError}
        </p>
      ) : (
        <p className="mt-1.5 text-muted-foreground text-xs">{labels.helper}</p>
      )}
    </div>
  );
}
