"use client";

import { Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/bootstrap/i18n/routing";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { localeOptions } from "./locale-options";

/**
 * Language row of the header avatar menu (design v3 `ui.jsx` Header dropdown).
 *
 * The locale is URL state, never client state — switching is
 * `router.replace(<same path + query>, { locale })`, so the current screen and
 * its filters survive the switch and `<html lang>` follows the new prefix.
 *
 * Semantics: `DropdownMenuRadioGroup` + `DropdownMenuRadioItem`
 * (`role="menuitemradio"` + `aria-checked`). NOT native radios in a plain
 * `<div role="radiogroup">`: Radix's menu content blocks Tab and roving-focuses
 * only its OWN registered item collection, so anything that is not a menu item
 * is keyboard-unreachable once the menu is open (WCAG 2.1.1, US-E24.12 review).
 */
export function LanguageSwitcher() {
  const t = useTranslations("shell.header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const options = localeOptions(locale);

  function select(next: string) {
    const target = options.find((option) => option.locale === next);
    if (!target || target.selected || !pathname) return;
    const search = searchParams?.toString();
    router.replace(`${pathname}${search ? `?${search}` : ""}`, {
      locale: target.locale,
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-foreground">
        <Globe
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        {t("language")}
      </div>
      <DropdownMenuRadioGroup value={locale} onValueChange={select}>
        {options.map((option) => (
          <DropdownMenuRadioItem
            key={option.locale}
            value={option.locale}
            // 44px touch target on mobile (repo idiom) + an explicit focus ring
            // with the theme-aware offset colour used across the app shell.
            className="max-[820px]:min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t(option.labelKey)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
