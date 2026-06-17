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
