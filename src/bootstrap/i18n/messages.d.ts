import type messages from "./messages/vi.json";

/**
 * next-intl v4 type augmentation (decision `0020`). `vi.json` is the single
 * source of truth for message KEYS → `useTranslations`/`getTranslations` keys
 * are checked at compile time (a typo'd key = build error = easy to trace).
 * `en.json` must mirror `vi.json`'s shape.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: "en" | "vi";
    Messages: typeof messages;
  }
}
