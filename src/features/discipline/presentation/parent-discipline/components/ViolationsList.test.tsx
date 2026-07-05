import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { MOCK_MY_VIOLATIONS } from "../../../infrastructure/repositories/mocks/fixtures";
import { ViolationsList } from "./ViolationsList";

/**
 * US-E17.11 / AC-E17.11-10 — touch-target regression guard for the read-only
 * parent violation list. Parents only view (never delete/edit), so this list
 * has NO icon buttons and only the row-height requirement applies.
 *
 * The repo's vitest env is `node` (no jsdom / @testing-library), so we render
 * to static markup and assert the row <li> keeps its `py-4` (16px) vertical
 * padding — the compliance mechanism that (with the stacked title/badge/
 * description/date content) keeps each row well above the 44px floor. Locking
 * `py-4` in gives CI signal if a future refactor shrinks the row spacing.
 */
function renderList(): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      <ViolationsList violations={MOCK_MY_VIOLATIONS} />
    </NextIntlClientProvider>,
  );
}

describe("ViolationsList (parent) — touch target 44px (US-E17.11)", () => {
  it("AC-E17.11-10: each violation <li> row keeps py-4 vertical padding", () => {
    const html = renderList();
    const rows = html.match(/<li[^>]*>/g) ?? [];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row).toContain("py-4");
    }
  });
});
