/**
 * Maps a semantic colour key (from the domain entity `color` field) to the
 * tokens-only avatar classes: a tinted background + matching foreground text.
 * Never emits raw colour — only `bg-edu-*`/`text-edu-*` tokens from tokens.css.
 */
const TONE_CLASSES: Record<string, string> = {
  primary: "bg-edu-primary/15 text-edu-primary",
  success: "bg-edu-success/15 text-edu-success-text",
  warning: "bg-edu-warning/20 text-edu-warning-foreground",
  error: "bg-edu-error/15 text-edu-error-text",
  info: "bg-edu-info/15 text-edu-info",
  purple: "bg-edu-purple/15 text-edu-purple-text",
  teal: "bg-edu-teal/15 text-edu-teal-text",
};

export function avatarToneClasses(color: string): string {
  return TONE_CLASSES[color] ?? TONE_CLASSES.primary;
}

/**
 * The foreground `text-edu-*` token for a tone, without the tinted background.
 * Mirrors the `text-*` half of {@link TONE_CLASSES} — used where only the
 * coloured text is wanted (e.g. group sender name in a chat bubble).
 */
const TONE_TEXT_CLASSES: Record<string, string> = {
  primary: "text-edu-primary",
  success: "text-edu-success-text",
  warning: "text-edu-warning-foreground",
  error: "text-edu-error-text",
  info: "text-edu-info",
  purple: "text-edu-purple-text",
  teal: "text-edu-teal-text",
};

export function avatarToneTextClass(color: string): string {
  return TONE_TEXT_CLASSES[color] ?? TONE_TEXT_CLASSES.primary;
}
