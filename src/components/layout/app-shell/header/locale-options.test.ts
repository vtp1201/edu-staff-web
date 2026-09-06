import { describe, expect, it } from "vitest";
import { localeOptions } from "./locale-options";

describe("localeOptions", () => {
  it("always offers Vietnamese first, then English", () => {
    expect(localeOptions("vi").map((o) => o.locale)).toEqual(["vi", "en"]);
    expect(localeOptions("en").map((o) => o.locale)).toEqual(["vi", "en"]);
  });

  it("marks exactly the current locale as selected", () => {
    expect(localeOptions("vi").map((o) => o.selected)).toEqual([true, false]);
    expect(localeOptions("en").map((o) => o.selected)).toEqual([false, true]);
  });

  it("carries the i18n label key, never a hardcoded label", () => {
    expect(localeOptions("vi").map((o) => o.labelKey)).toEqual([
      "languageVi",
      "languageEn",
    ]);
  });

  /**
   * `useLocale()` is typed as `string` at the call site — an unknown locale
   * (e.g. a stale cookie) must not crash or mark two options selected; nothing
   * is selected, and the user can still pick a language.
   */
  it("selects nothing for an unknown locale", () => {
    expect(localeOptions("fr").map((o) => o.selected)).toEqual([false, false]);
  });
});
