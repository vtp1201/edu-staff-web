"use client";

import { useCallback } from "react";

/**
 * localStorage-backed draft persistence for the submit sheet, keyed by
 * assignmentId. The draft is the submission `content` — the only thing a
 * submission carries (there is no attachment anywhere in the `lms` contract).
 *
 * Presentation-local ONLY — NOT a repository method, NOT a Server Action, NOT
 * TanStack Query: nothing here touches the network. A localStorage quota
 * failure is swallowed (out of scope).
 */
export function useAssignmentDraft(assignmentId: string) {
  const key = `lms.assignment-draft.${assignmentId}`;

  const getDraft = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const saveDraft = useCallback(
    (content: string): void => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, content);
      } catch {
        // quota / private-mode failure — out of scope.
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
