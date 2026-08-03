/**
 * Canonical marker for a value the app genuinely does not have (decision 0026).
 *
 * Promoted in US-E18.35 from two structurally identical feature-local copies:
 * `admin-roster`'s `MissingValue` (US-E18.35 — a student's unset dob/gender per
 * ADR-0122, an unresolved IAM member, the student code no contract carries) and
 * `moderation`'s `UnavailableValue` (US-E18.32 — the by-design-omitted reporter
 * identity, the denormalized preview/author, a terminally-failed stats read).
 * Same shape, same token, same a11y contract → one home, no fork.
 *
 * It is a PLACEHOLDER, never an error message, and never a fabricated value
 * ("Ẩn danh", "0"): "we do not have this" and "the data says X" must never look
 * the same. The em dash is `aria-hidden` and paired with sr-only text, so an
 * assistive-tech user hears the reason instead of a punctuation mark
 * (accessibility.md — meaning is never carried by a glyph alone).
 *
 * Dumb presentational primitive, like `PresenceDot`/`StatusBadge`: no
 * `useTranslations` inside. Each feature keeps its OWN copy and passes it
 * already translated — "Chưa cập nhật" (admin-roster) vs "Không có dữ liệu"
 * (moderation) are different statements, not one shared string.
 */
export interface AbsentValueProps {
  /** Already-translated explanation, announced to screen readers only. */
  label: string;
}

export function AbsentValue({ label }: AbsentValueProps) {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
