"use client";

import { Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/bootstrap/i18n/locales";
import { usePathname, useRouter } from "@/bootstrap/i18n/routing";
import { cn } from "@/shared/utils";
import { localeOptions } from "./locale-options";

/**
 * Language row of the header avatar menu: a label + a segmented pair of
 * options (design v3 `ui.jsx` Header dropdown).
 *
 * The locale is URL state, never client state — switching is
 * `router.replace(<same path + query>, { locale })`, so the current screen and
 * its filters survive the switch and `<html lang>` follows the new prefix.
 *
 * Semantics: a real `radiogroup` built from visually-hidden native radios
 * inside `<label>`s. Biome's `a11y/useSemanticElements` rejects
 * `role="radio"` on a `<button>`, and native radios give the group free
 * arrow-key navigation plus a real checked state (repo pattern, see
 * `period-log-form.tsx`).
 */
export function LanguageSwitcher() {
  const t = useTranslations("shell.header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const options = localeOptions(locale);

  function select(next: Locale) {
    if (next === locale || !pathname) return;
    const search = searchParams?.toString();
    router.replace(`${pathname}${search ? `?${search}` : ""}`, {
      locale: next,
    });
  }

  return (
    <div className="px-2 py-1.5">
      <div className="mb-2 flex items-center gap-2 text-sm text-foreground">
        <Globe
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        {t("language")}
      </div>
      <div
        className="flex gap-1.5"
        role="radiogroup"
        aria-label={t("language")}
      >
        {options.map((option) => (
          <label
            key={option.locale}
            className={cn(
              "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[var(--edu-radius-btn)] border-2 px-2 text-xs transition-colors",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              option.selected
                ? "border-primary bg-primary/12 font-bold text-primary"
                : "border-border font-medium text-muted-foreground",
            )}
          >
            <input
              type="radio"
              name="app-locale"
              className="sr-only"
              value={option.locale}
              checked={option.selected}
              onChange={() => select(option.locale)}
            />
            {t(option.labelKey)}
          </label>
        ))}
      </div>
    </div>
  );
}
