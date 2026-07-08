import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { SsePendingPill } from "./sse-pending-pill";

/**
 * Node-env static-markup assertions (no jsdom / @testing-library). Click →
 * onClick navigation is covered by the Storybook interaction stories.
 */
function render(ui: React.ReactElement) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SsePendingPill", () => {
  it("renders nothing when not visible (AC-9)", () => {
    const html = render(
      <SsePendingPill count={5} visible={false} onClick={vi.fn()} />,
    );
    expect(html).toBe("");
  });

  it("renders nothing when count is zero", () => {
    const html = render(
      <SsePendingPill count={0} visible={true} onClick={vi.fn()} />,
    );
    expect(html).toBe("");
  });

  it("renders a fixed, 44px-min native button with the count (AC-7)", () => {
    const html = render(
      <SsePendingPill count={3} visible={true} onClick={vi.fn()} />,
    );
    expect(html).toContain('type="button"');
    expect(html).toContain("fixed");
    expect(html).toContain("bottom-6");
    expect(html).toContain("right-6");
    expect(html).toContain("z-40");
    expect(html).toContain("min-h-11");
    expect(html).toContain("min-w-11");
    expect(html).toContain(">3<");
  });

  it("caps the visible badge at 99+ when count exceeds 99 (AC-7)", () => {
    const html = render(
      <SsePendingPill count={140} visible={true} onClick={vi.fn()} />,
    );
    expect(html).toContain(
      messages.shell.sseStatus.pendingMessageOverflowLabel,
    );
    // The aria-label still states the real count, not "99+".
    expect(html).toContain("140");
  });

  it("uses the singular aria-label sentence when count is 1 (AC-10)", () => {
    const html = render(
      <SsePendingPill count={1} visible={true} onClick={vi.fn()} />,
    );
    expect(html).toContain(
      `aria-label="${messages.shell.sseStatus.pendingMessageOne}"`,
    );
  });

  it("uses the plural aria-label sentence with the count interpolated (AC-10)", () => {
    const html = render(
      <SsePendingPill count={3} visible={true} onClick={vi.fn()} />,
    );
    const expected = messages.shell.sseStatus.pendingMessageMany.replace(
      "{count}",
      "3",
    );
    expect(html).toContain(`aria-label="${expected}"`);
  });

  it("hides the visible count glyph from AT (aria-label supersedes it)", () => {
    const html = render(
      <SsePendingPill count={3} visible={true} onClick={vi.fn()} />,
    );
    expect(html).toContain('aria-hidden="true"');
  });
});
