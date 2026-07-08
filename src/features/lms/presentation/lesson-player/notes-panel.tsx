"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface NotesPanelProps {
  lessonId: string;
  initialValue: string;
  isSaving: boolean;
  saved: boolean;
  errorKey: string | null;
  onSave: (lessonId: string, content: string) => void;
  labels: {
    placeholder: string;
    saveButton: string;
    saving: string;
    savedToast: string;
    error: string;
  };
}

/** Personal notes textarea + explicit Save (AC-12). Draft is local until Save. */
export function NotesPanel({
  lessonId,
  initialValue,
  isSaving,
  saved,
  errorKey,
  onSave,
  labels,
}: NotesPanelProps) {
  const [draft, setDraft] = useState(initialValue);
  const fieldId = useId();
  const statusId = useId();

  // Seed from the persisted note once it loads for this lesson.
  useEffect(() => {
    setDraft(initialValue);
  }, [initialValue]);

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={fieldId} className="sr-only">
        {labels.placeholder}
      </label>
      <Textarea
        id={fieldId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={labels.placeholder}
        aria-describedby={errorKey ? statusId : undefined}
        aria-invalid={errorKey ? true : undefined}
        className="min-h-24 resize-y"
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={isSaving}
          onClick={() => onSave(lessonId, draft)}
        >
          {isSaving ? labels.saving : labels.saveButton}
        </Button>
        {saved && !errorKey && (
          <span role="status" className="text-edu-success-text text-xs">
            {labels.savedToast}
          </span>
        )}
      </div>
      {errorKey && (
        <p id={statusId} role="alert" className="text-edu-error-text text-xs">
          {labels.error}
        </p>
      )}
    </div>
  );
}
