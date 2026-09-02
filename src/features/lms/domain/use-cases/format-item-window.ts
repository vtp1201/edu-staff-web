/**
 * The availability window a timeline row prints, as a DISCRIMINATED RESULT —
 * never as finished copy (US-E24.3).
 *
 * The four branches ("start → due" / "Mở từ …" / "Hạn …" / "Luôn mở") are one
 * rule shared by the timeline, the cross-subject list (US-E24.4) and the player
 * (US-E24.5). Deciding WHICH branch applies is domain logic; wording it is
 * i18n, which the domain may not touch (i18n.md). So this returns a `kind` plus
 * already-formatted date TEXT — the dates are formatted by an injected
 * formatter, which keeps the function free of `Intl`/next-intl and trivially
 * testable, while presentation composes the sentence with `t()`.
 */
export type ItemWindow =
  | { kind: "range"; startText: string; dueText: string }
  | { kind: "from"; startText: string }
  | { kind: "due"; dueText: string }
  | { kind: "always" };

export interface ItemWindowInput {
  startAt: string | null;
  dueAt: string | null;
}

/** Formats one instant for display; supplied by presentation (`useFormatter`). */
export type DateTextFormatter = (date: Date) => string;

function textOf(iso: string | null, format: DateTextFormatter): string | null {
  if (iso === null) return null;
  const ms = Date.parse(iso);
  // A boundary BE sent in a shape we cannot parse is treated as ABSENT: an
  // "Invalid Date" on screen would be worse than the honest "no boundary" copy.
  if (!Number.isFinite(ms)) return null;
  return format(new Date(ms));
}

export function formatItemWindow(
  item: ItemWindowInput,
  format: DateTextFormatter,
): ItemWindow {
  const startText = textOf(item.startAt, format);
  const dueText = textOf(item.dueAt, format);

  if (startText !== null && dueText !== null) {
    return { kind: "range", startText, dueText };
  }
  if (startText !== null) return { kind: "from", startText };
  if (dueText !== null) return { kind: "due", dueText };
  return { kind: "always" };
}
