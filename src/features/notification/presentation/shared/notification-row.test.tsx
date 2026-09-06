import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "@/bootstrap/i18n/messages/en.json";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { NotificationEntity } from "../../domain/entities/notification.entity";
import { NotificationRow } from "./notification-row";

/**
 * US-E24.13 — `NotificationRow` was promoted out of `notifications-center.tsx`
 * (decision 0026: move, don't copy) and gained a `variant` prop so the bell
 * dropdown can reuse it at 360px width.
 *
 * The repo's vitest env is `node` (no jsdom / @testing-library), so we render
 * to static markup and assert the structural differences that ARE the variant
 * contract. `variant="full"` is the default and must reproduce the centre's
 * pre-promotion markup byte-for-byte (the centre's own stories are the wider
 * regression guard).
 */
function makeItem(overrides: Partial<NotificationEntity> = {}) {
  return {
    id: "n-1",
    type: "discipline",
    titleKey: "notification_discipline_violation_title",
    titleParams: { severity: "MINOR" },
    bodyKey: "notification_discipline_violation_body",
    bodyParams: { severity: "MINOR" },
    ts: new Date().toISOString(),
    read: false,
    ...overrides,
  } satisfies NotificationEntity;
}

function render(
  props: Parameters<typeof NotificationRow>[0],
  locale: "vi" | "en" = "vi",
): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "vi" ? messages : en}
    >
      <NotificationRow {...props} />
    </NextIntlClientProvider>,
  );
}

const noop = () => {};

describe("NotificationRow — variant='full' (default, centre behaviour)", () => {
  it("renders a 40px icon box, the body line and the type badge", () => {
    const html = render({ item: makeItem(), onMarkRead: noop });
    expect(html).toContain("size-10");
    expect(html).toContain("line-clamp-2"); // 2-line body
    expect(html).toContain(messages.notifications.type_discipline); // badge pill
  });

  it("signals unread with the left-border stripe, not a trailing dot", () => {
    const html = render({ item: makeItem(), onMarkRead: noop });
    expect(html).toContain("w-[3px]");
    expect(html).not.toContain('data-slot="notification-unread-dot"');
  });

  it("drops the stripe and the bold title once read", () => {
    const html = render({ item: makeItem({ read: true }), onMarkRead: noop });
    expect(html).not.toContain("w-[3px]");
    expect(html).toContain("font-normal");
  });
});

describe("NotificationRow — variant='compact' (bell dropdown)", () => {
  it("renders a 32px icon box, no body line and no type badge", () => {
    const html = render({
      item: makeItem(),
      onMarkRead: noop,
      variant: "compact",
    });
    expect(html).toContain("size-8");
    expect(html).not.toContain("size-10");
    // The 2-line body copy is dropped entirely at this density (title only).
    expect(html).not.toContain("vừa được ghi nhận");
    expect(html).not.toContain(messages.notifications.type_discipline);
  });

  it("signals unread with a trailing dot, not the left-border stripe", () => {
    const html = render({
      item: makeItem(),
      onMarkRead: noop,
      variant: "compact",
    });
    expect(html).toContain('data-slot="notification-unread-dot"');
    expect(html).not.toContain("w-[3px]");
  });

  it("renders no unread dot for a read notification", () => {
    const html = render({
      item: makeItem({ read: true }),
      onMarkRead: noop,
      variant: "compact",
    });
    expect(html).not.toContain('data-slot="notification-unread-dot"');
  });

  it("keeps the title and the accessible row label in both variants", () => {
    for (const variant of ["full", "compact"] as const) {
      const html = render({ item: makeItem(), onMarkRead: noop, variant });
      expect(html).toContain("Vi phạm kỷ luật mức nhẹ");
      expect(html).toContain("chưa đọc"); // aria-label read-state suffix
    }
  });
});

/**
 * US-E24.13 review — the row's relative timestamp used to come from a
 * hand-rolled helper with hardcoded vi/en literals, called with a literal
 * `"vi"` at BOTH call sites, so an EN-locale user read "10 phút trước". It is
 * now `useFormatter().relativeTime()` under the ACTIVE locale.
 */
describe("NotificationRow — relative timestamp follows the active locale", () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();

  it("renders Vietnamese under locale vi", () => {
    for (const variant of ["full", "compact"] as const) {
      const html = render(
        { item: makeItem({ ts: tenMinutesAgo }), onMarkRead: noop, variant },
        "vi",
      );
      expect(html).toContain("10 phút trước");
    }
  });

  it("renders English under locale en — never Vietnamese", () => {
    for (const variant of ["full", "compact"] as const) {
      const html = render(
        { item: makeItem({ ts: tenMinutesAgo }), onMarkRead: noop, variant },
        "en",
      );
      expect(html).toContain("10 minutes ago");
      expect(html).not.toContain("phút trước");
    }
  });

  it("falls back to the raw wire value for an unparseable timestamp", () => {
    const html = render({
      item: makeItem({ ts: "not-a-date" }),
      onMarkRead: noop,
    });
    expect(html).toContain("not-a-date");
  });
});
