"use client";

import { useCallback } from "react";

export interface AssignmentDraft {
  answerText?: string;
  fileName?: string;
}

/**
 * localStorage-backed draft persistence for the submit sheet, keyed by
 * assignmentId. Presentation-local ONLY — NOT a repository method, NOT a Server
 * Action, NOT TanStack Query (integration.md INT-117-03: fully client-local, no
 * network). A localStorage quota failure is out of scope (swallowed).
 */
export function useAssignmentDraft(assignmentId: string) {
  const key = `lms.assignment-draft.${assignmentId}`;

  const getDraft = useCallback((): AssignmentDraft | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as AssignmentDraft) : null;
    } catch {
      return null;
    }
  }, [key]);

  const saveDraft = useCallback(
    (draft: AssignmentDraft): void => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, JSON.stringify(draft));
      } catch {
        // quota / private-mode failure — out of scope (INT-117-03).
      }
    },
    [key],
  );

  const clearDraft = useCallback((): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return { getDraft, saveDraft, clearDraft };
}
