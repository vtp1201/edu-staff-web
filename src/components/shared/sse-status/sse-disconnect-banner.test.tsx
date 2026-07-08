import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { SseDisconnectBanner } from "./sse-disconnect-banner";

/**
 * The repo's Vitest runs in `node` env (no jsdom / @testing-library). DOM
 * structure + tokens are proven here via react-dom/server static markup;
 * click/onReconnect interaction is covered by the Storybook interaction stories
 * (browser env).
 */
function render(ui: React.ReactElement) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SseDisconnectBanner", () => {
  it("keeps the live region mounted but hidden with no content when status is undefined (AC-1, A11Y-006)", () => {
    const html = render(<SseDisconnectBanner onReconnect={vi.fn()} />);
    // A11Y-006: the role=status node stays in the DOM from first paint so SRs
    // register the live region; it is visually hidden and carries no content.
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("hidden");
    expect(html).not.toContain(messages.shell.sseStatus.disconnectedTitle);
    expect(html).not.toContain(messages.shell.sseStatus.reconnectingTitle);
    expect(html).not.toContain(messages.shell.sseStatus.reconnectButton);
  });

  it("exposes the live region as a programmatic focus target (A11Y-003)", () => {
    const html = render(
      <SseDisconnectBanner status="disconnected" onReconnect={vi.fn()} />,
    );
    expect(html).toContain('tabindex="-1"');
  });

  it("renders a polite status live region with warning tokens when disconnected (AC-5/AC-11)", () => {
    const html = render(
      <SseDisconnectBanner status="disconnected" onReconnect={vi.fn()} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("bg-edu-warning-light");
    expect(html).toContain("border-edu-warning");
    expect(html).toContain("text-edu-warning-text");
  });

  it("shows the disconnected title/body and an enabled reconnect button (AC-2)", () => {
    const html = render(
      <SseDisconnectBanner status="disconnected" onReconnect={vi.fn()} />,
    );
    expect(html).toContain(messages.shell.sseStatus.disconnectedTitle);
    expect(html).toContain(messages.shell.sseStatus.disconnectedBody);
    expect(html).toContain(messages.shell.sseStatus.reconnectButton);
    // The reconnect button must not carry the disabled attribute when
    // disconnected (the cva class string contains "disabled:" utilities, so
    // assert against the rendered attribute form, not the substring).
    expect(html).not.toContain('disabled=""');
  });

  it("marks the WifiOff icon aria-hidden (text carries the meaning)", () => {
    const html = render(
      <SseDisconnectBanner status="disconnected" onReconnect={vi.fn()} />,
    );
    expect(html).toContain('aria-hidden="true"');
  });

  it("shows the reconnecting title + spinner and no reconnect button when connecting (AC-3)", () => {
    const html = render(
      <SseDisconnectBanner status="connecting" onReconnect={vi.fn()} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain(messages.shell.sseStatus.reconnectingTitle);
    expect(html).toContain("animate-spin");
    // Button unmounted while reconnecting (cleaner focus story).
    expect(html).not.toContain(messages.shell.sseStatus.reconnectButton);
  });
});
