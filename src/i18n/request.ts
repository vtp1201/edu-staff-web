import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

function isValidLocale(locale: string): locale is "en" | "vi" {
  return routing.locales.includes(locale as "en" | "vi");
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: "en" | "vi" = (await requestLocale) as "en" | "vi";
  if (!locale || !isValidLocale(locale)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
