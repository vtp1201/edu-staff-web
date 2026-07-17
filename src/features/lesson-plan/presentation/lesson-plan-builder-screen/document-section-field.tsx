"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import type { DocumentSectionKey } from "../../domain/entities/lesson-plan.entity";

export interface DocumentSectionFieldProps {
  sectionKey: DocumentSectionKey;
  icon: LucideIcon;
  label: string;
  placeholder: string;
  requiredError: string;
  value: string;
  isLocked: boolean;
  /** touched && trimmed-empty (AC-003.2 per-field required marking). */
  isInvalid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

/**
 * One of the 4 named document sections (rows=4 textarea). Rendered 4× by the
 * screen — icon/copy are external props (icon-agnostic, easy to test). Inline
 * error is text + role="alert" + aria-invalid + aria-describedby (a11y contract).
 */
export function DocumentSectionField({
  sectionKey,
  icon: Icon,
  label,
  placeholder,
  requiredError,
  value,
  isLocked,
  isInvalid,
  onChange,
  onBlur,
}: DocumentSectionFieldProps) {
  const id = `lp-section-${sectionKey}`;
  const errorId = `${id}-err`;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Label
        htmlFor={id}
        className="mb-2 flex items-center gap-1.5 font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wide"
      >
        <Icon className="size-3" aria-hidden="true" />
        {label}
        <span aria-hidden="true" className="text-edu-error-text">
          *
        </span>
      </Label>
      <Textarea
        id={id}
        rows={4}
        value={value}
        disabled={isLocked}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? errorId : undefined}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(isInvalid && "border-edu-error-text")}
      />
      {isInvalid && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-edu-error-text text-xs"
        >
          <AlertTriangle className="size-3" aria-hidden="true" />
          {requiredError}
        </p>
      )}
    </div>
  );
}
