/** Locale constants — kept free of next-intl/navigation so non-React code
 * (middleware, tenant resolver) can import them without pulling next/navigation. */
export const LOCALES = ["en", "vi"] as const;
export const DEFAULT_LOCALE = "vi";

export type Locale = (typeof LOCALES)[number];
