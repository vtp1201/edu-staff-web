import type { Locale } from "@/bootstrap/i18n/locales";
import type messages from "@/bootstrap/i18n/messages/vi.json";

/** i18n keys under `shell.header` — checked against messages at compile time. */
type HeaderLabelKey = keyof (typeof messages)["shell"]["header"];

export type LocaleOption = {
  locale: Locale;
  labelKey: HeaderLabelKey;
  selected: boolean;
};

/** Display order is fixed (vi source locale first), independent of selection. */
const ORDER: { locale: Locale; labelKey: HeaderLabelKey }[] = [
  { locale: "vi", labelKey: "languageVi" },
  { locale: "en", labelKey: "languageEn" },
];

/**
 * The language switcher's options for the locale currently in the URL.
 *
 * Pure so the "which one is selected" rule is testable without a router:
 * `useLocale()` is typed `string`, so an unrecognised value (stale cookie,
 * hand-edited URL) must simply select nothing rather than crash or light up
 * two options.
 */
export function localeOptions(current: string): LocaleOption[] {
  return ORDER.map((option) => ({
    ...option,
    selected: option.locale === current,
  }));
}
