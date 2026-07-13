export type ReportContentKind = "post" | "comment" | "message";

/** Wire-enum ids (integration.md INT-191-01) — NOT design_src's ids
 *  (language/bully/misinfo). Reconciled to the BE contract. */
export type ReportReasonId =
  | "spam"
  | "inappropriate-language"
  | "bullying"
  | "misinformation"
  | "other";

/** All reason ids in display order (drives the radiogroup + validation). */
export const REPORT_REASON_IDS: readonly ReportReasonId[] = [
  "spam",
  "inappropriate-language",
  "bullying",
  "misinformation",
  "other",
] as const;

export interface ReportContentDialogProps {
  /** Controlled visibility — host owns open/close. */
  open: boolean;
  kind: ReportContentKind;
  /** Author of the reported content — display only, framing copy. */
  authorName: string;
  /** Already-resolved plain-text preview — clamped to 3 lines by CSS. */
  contentPreview: string;
  /** Host-owned async state (mirrors DestructiveConfirmDialog). */
  isSubmitting: boolean;
  /**
   * 422 — inline, non-retryable (user must fix input, not retry the same call).
   * Message is already translated by the host.
   * `fieldError`/`transientError`/`infoMessage` are mutually exclusive by
   * construction — the host sets at most one per render.
   */
  fieldError?: { message: string };
  /** Retryable transient failure (429/502/503/504). Message host-translated. */
  transientError?: { message: string; onRetry: () => void };
  /** 409 ALREADY_REPORTED — informational tone, not an error. Host-translated. */
  infoMessage?: string;
  onSubmit: (input: { reason: ReportReasonId; note?: string }) => void;
  onCancel: () => void;
}
