/**
 * The 8-swatch group-avatar palette (US-E10.4, TR-003). The first six are
 * semantic design-system colours referenced by token key; the last two are
 * hex constants used ONLY here as swatch values (not Tailwind classes). The
 * `value` is stored on the group entity; `cssColor` is the resolved colour for
 * the live preview / swatch dot (computed/dynamic — exempt from tokens-only).
 */
export type ColorSwatch = {
  /** Persisted value — semantic key for the first six, hex for the last two. */
  value: string;
  /** Resolved CSS colour for rendering the swatch + preview. */
  cssColor: string;
};

export const GROUP_COLOR_SWATCHES: ColorSwatch[] = [
  { value: "primary", cssColor: "var(--edu-primary)" },
  { value: "success", cssColor: "var(--edu-success)" },
  { value: "warning", cssColor: "var(--edu-warning)" },
  { value: "error", cssColor: "var(--edu-error)" },
  { value: "purple", cssColor: "var(--edu-purple)" },
  { value: "teal", cssColor: "var(--edu-teal)" },
  { value: "#6366F1", cssColor: "#6366F1" },
  { value: "#FB923C", cssColor: "#FB923C" },
];

/** Resolves a persisted colour value to a renderable CSS colour. */
export function resolveSwatchColor(value: string): string {
  const found = GROUP_COLOR_SWATCHES.find((s) => s.value === value);
  return found?.cssColor ?? "var(--edu-primary)";
}

/** First-letter initials (max 3) for the live avatar preview. */
export function previewInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
