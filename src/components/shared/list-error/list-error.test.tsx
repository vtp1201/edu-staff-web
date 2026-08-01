import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ListError, type ListErrorProps } from "./list-error";

/**
 * `ListError` is the canonical list-level error + retry card
 * (INFRA-shared-list-states). DOM structure is proven here via react-dom/server
 * static markup (this repo's Vitest runs in node env — no
 * @testing-library/react); click/interaction coverage lives in
 * list-error.stories.tsx.
 *
 * The "per-screen parity" block is the "zero visual change" proof for the
 * refactor: each expected class set is the literal class list of the DELETED
 * feature-local component this one replaces, with two deliberate exceptions:
 * (1) `min-h-11` is now unconditional — a 44×44px touch-target compliance fix
 * per accessibility.md, not a design change; (2) the boxed icon variant uses
 * `bg-edu-error-light`/`text-edu-error-text` instead of the originals'
 * `bg-edu-error-dark-light`/`text-edu-error-dark` — a dark-mode contrast fix
 * (fe-accessibility-auditor finding, INFRA-shared-list-states story) swapping
 * to the equivalent, already dark-mode-safe token pair; same tone family, no
 * new token, visually near-identical in light mode.
 */

/**
 * Class tokens of the nth element carrying a class attribute, order-insensitive.
 * lucide's own `lucide lucide-*` marker classes are dropped — they are identical
 * in the originals and carry no styling of ours.
 */
function classesOf(html: string, nth = 0): Set<string> {
  const matches = [...html.matchAll(/class="([^"]*)"/g)];
  return new Set(
    (matches[nth]?.[1] ?? "")
      .split(" ")
      .filter((token) => token && !token.startsWith("lucide")),
  );
}
const setOf = (classes: string) => new Set(classes.split(" ").filter(Boolean));

describe("ListError", () => {
  it("always exposes the failure via role=alert", () => {
    const html = renderToStaticMarkup(
      <ListError
        message="Lỗi"
        retryLabel="Thử lại"
        shape="inline-card"
        iconSize={10}
        onRetry={vi.fn()}
      />,
    );
    expect(html).toContain('role="alert"');
  });

  it("renders a decorative (aria-hidden) icon at the requested size", () => {
    const html = renderToStaticMarkup(
      <ListError
        message="Lỗi"
        retryLabel="Thử lại"
        shape="inline-card"
        iconSize={12}
        onRetry={vi.fn()}
      />,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(classesOf(html, 1)).toEqual(setOf("size-12 text-edu-error-text"));
  });

  it("renders the message line and NOT title/description when message is set", () => {
    // `ListErrorProps` is a discriminated union — message + title/description is
    // already a COMPILE error. The cast proves the runtime fallback still favours
    // `message` if the union is ever bypassed (e.g. props spread from untyped JS).
    const bothProps = {
      message: "Không tải được",
      title: "không hiển thị",
      description: "cũng không",
      retryLabel: "Thử lại",
      shape: "inline-card",
      iconSize: 10,
      onRetry: vi.fn(),
    } as unknown as ListErrorProps;
    const html = renderToStaticMarkup(<ListError {...bothProps} />);
    expect(html).toContain("Không tải được");
    expect(html).not.toContain("không hiển thị");
    expect(html).not.toContain("cũng không");
  });

  it("renders title/description independently when message is absent", () => {
    const titleOnly = renderToStaticMarkup(
      <ListError
        title="Tiêu đề"
        retryLabel="Thử lại"
        shape="bordered-card"
        iconSize={12}
        onRetry={vi.fn()}
      />,
    );
    expect(titleOnly).toContain("Tiêu đề");
    expect(titleOnly).not.toContain("max-w-sm");

    const both = renderToStaticMarkup(
      <ListError
        title="Tiêu đề"
        description="Mô tả"
        retryLabel="Thử lại"
        shape="bordered-card"
        iconSize={12}
        onRetry={vi.fn()}
      />,
    );
    expect(both).toContain("Mô tả");
    expect(both).toContain("max-w-sm");
  });

  it("wraps the icon in a tinted box only for the boxed variant", () => {
    const boxed = renderToStaticMarkup(
      <ListError
        title="T"
        retryLabel="Thử lại"
        shape="bordered-card"
        iconVariant="boxed"
        iconSize={6}
        onRetry={vi.fn()}
      />,
    );
    expect(classesOf(boxed, 1)).toEqual(
      setOf(
        "flex size-13 items-center justify-center rounded-2xl bg-edu-error-light",
      ),
    );
    expect(classesOf(boxed, 2)).toEqual(setOf("size-6 text-edu-error-text"));

    const plain = renderToStaticMarkup(
      <ListError
        title="T"
        retryLabel="Thử lại"
        shape="bordered-card"
        iconSize={12}
        onRetry={vi.fn()}
      />,
    );
    expect(plain).not.toContain("bg-edu-error-light");
  });

  it("renders a type=button retry that is ≥44px tall on every screen", () => {
    const html = renderToStaticMarkup(
      <ListError
        message="Lỗi"
        retryLabel="Thử lại"
        shape="inline-card"
        iconSize={10}
        onRetry={vi.fn()}
      />,
    );
    expect(html).toContain('type="button"');
    expect(html).toContain("min-h-11");
    expect(html).toContain("Thử lại");
  });

  it("omits the retry control ENTIRELY when showRetry is false (403-class failures)", () => {
    // A non-retryable failure (403 forbidden) must not render a dead control —
    // omitted, not disabled, mirroring FeedErrorState's `showRetry` precedent.
    const html = renderToStaticMarkup(
      <ListError
        title="Không có quyền"
        description="Tài khoản của bạn không được phép xem danh sách này."
        retryLabel="Thử lại"
        shape="bordered-card"
        iconSize={12}
        showRetry={false}
        onRetry={vi.fn()}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Không có quyền");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Thử lại");
  });

  it("renders a retry icon only when asked to", () => {
    const none = renderToStaticMarkup(
      <ListError
        message="Lỗi"
        retryLabel="Thử lại"
        shape="inline-card"
        iconSize={10}
        onRetry={vi.fn()}
      />,
    );
    // default retryIcon "none" → exactly one svg (the AlertTriangle)
    expect(none.match(/<svg/g)).toHaveLength(1);

    const rotate = renderToStaticMarkup(
      <ListError
        message="Lỗi"
        retryLabel="Thử lại"
        shape="inline-card"
        iconSize={10}
        retryIcon="rotate"
        onRetry={vi.fn()}
      />,
    );
    expect(rotate.match(/<svg/g)).toHaveLength(2);

    const refresh = renderToStaticMarkup(
      <ListError
        message="Lỗi"
        retryLabel="Thử lại"
        shape="inline-card"
        iconSize={10}
        retryIcon="refresh"
        onRetry={vi.fn()}
      />,
    );
    expect(refresh.match(/<svg/g)).toHaveLength(2);
  });

  describe("per-screen parity with the deleted feature-local components", () => {
    it("reproduces SDListError / SAListError exactly", () => {
      const html = renderToStaticMarkup(
        <ListError
          message="Không tải được danh sách"
          retryLabel="Thử lại"
          shape="inline-card"
          retryIcon="rotate"
          retryButtonVariant="outline"
          iconSize={10}
          onRetry={vi.fn()}
        />,
      );
      expect(classesOf(html, 0)).toEqual(
        setOf(
          "flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/20 bg-card px-5 py-10 text-center shadow-card",
        ),
      );
      expect(classesOf(html, 1)).toEqual(setOf("size-10 text-edu-error-text"));
      expect(classesOf(html, 2)).toEqual(
        setOf("font-bold text-foreground text-sm"),
      );
      expect(html).toContain("min-h-11");
    });

    it("reproduces PLError exactly (boxed icon, sm refresh button)", () => {
      const html = renderToStaticMarkup(
        <ListError
          title="Không tải được"
          description="Thử lại sau"
          retryLabel="Tải lại"
          shape="bordered-card"
          iconVariant="boxed"
          iconSize={6}
          retryIcon="refresh"
          retryButtonVariant="default"
          retryButtonSize="sm"
          className="py-13"
          onRetry={vi.fn()}
        />,
      );
      expect(classesOf(html, 0)).toEqual(
        setOf(
          "flex flex-col items-center rounded-xl border border-border bg-card px-6 py-13 text-center",
        ),
      );
      expect(classesOf(html, 3)).toEqual(
        setOf("mt-3.5 font-extrabold text-base text-foreground"),
      );
      expect(classesOf(html, 4)).toEqual(
        setOf("mt-1 max-w-sm text-muted-foreground text-sm"),
      );
      // PLError's button had `mt-4` only; `min-h-11` is the deliberate
      // touch-target compliance addition (accessibility.md ≥44×44px).
      expect(html).toContain("mt-4");
      expect(html).toContain("min-h-11");
    });

    it("reproduces InvitationsErrorState exactly (bare size-12 icon, no button icon)", () => {
      const html = renderToStaticMarkup(
        <ListError
          title="Không tải được lời mời"
          description="Đã xảy ra lỗi"
          retryLabel="Tải lại"
          shape="bordered-card"
          iconSize={12}
          retryIcon="none"
          retryButtonVariant="secondary"
          className="px-5"
          titleClassName="mt-4 font-bold text-base text-foreground"
          descriptionClassName="mt-2 max-w-sm text-edu-text-secondary text-sm"
          onRetry={vi.fn()}
        />,
      );
      expect(classesOf(html, 0)).toEqual(
        setOf(
          "flex flex-col items-center rounded-xl border border-border bg-card px-5 py-12 text-center",
        ),
      );
      expect(classesOf(html, 1)).toEqual(setOf("size-12 text-edu-error-text"));
      expect(classesOf(html, 2)).toEqual(
        setOf("mt-4 font-bold text-base text-foreground"),
      );
      expect(classesOf(html, 3)).toEqual(
        setOf("mt-2 max-w-sm text-edu-text-secondary text-sm"),
      );
      // No icon inside the retry button — only the AlertTriangle.
      expect(html.match(/<svg/g)).toHaveLength(1);
    });

    it("reproduces ConsentError exactly (PLError's card at py-10)", () => {
      const html = renderToStaticMarkup(
        <ListError
          title="Không tải được"
          description="Thử lại sau"
          retryLabel="Tải lại"
          shape="bordered-card"
          iconVariant="boxed"
          iconSize={6}
          retryIcon="refresh"
          retryButtonVariant="default"
          retryButtonSize="sm"
          className="py-10"
          onRetry={vi.fn()}
        />,
      );
      expect(classesOf(html, 0)).toEqual(
        setOf(
          "flex flex-col items-center rounded-xl border border-border bg-card px-6 py-10 text-center",
        ),
      );
      expect(classesOf(html, 1)).toEqual(
        setOf(
          "flex size-13 items-center justify-center rounded-2xl bg-edu-error-light",
        ),
      );
      expect(classesOf(html, 2)).toEqual(setOf("size-6 text-edu-error-text"));
      expect(classesOf(html, 3)).toEqual(
        setOf("mt-3.5 font-extrabold text-base text-foreground"),
      );
      expect(classesOf(html, 4)).toEqual(
        setOf("mt-1 max-w-sm text-muted-foreground text-sm"),
      );
      expect(html).toContain("mt-4");
      expect(html).toContain("min-h-11");
    });
  });

  describe("shape presets", () => {
    it("inline-card supplies SD/SA's outer card and keeps retry in the flow gap", () => {
      const html = renderToStaticMarkup(
        <ListError
          message="Lỗi"
          retryLabel="Thử lại"
          shape="inline-card"
          iconSize={10}
          onRetry={vi.fn()}
        />,
      );
      expect(classesOf(html, 0)).toEqual(
        setOf(
          "flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/20 bg-card px-5 py-10 text-center shadow-card",
        ),
      );
      expect(html).not.toContain("mt-4");
    });

    it("bordered-card supplies the plain card and spaces the retry by mt-4", () => {
      const html = renderToStaticMarkup(
        <ListError
          title="T"
          retryLabel="Thử lại"
          shape="bordered-card"
          iconSize={12}
          onRetry={vi.fn()}
        />,
      );
      expect(classesOf(html, 0)).toEqual(
        setOf(
          "flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center",
        ),
      );
      expect(html).toContain("mt-4");
    });

    it("title/description class props REPLACE the defaults (no tailwind-merge reliance)", () => {
      const html = renderToStaticMarkup(
        <ListError
          title="T"
          description="D"
          retryLabel="Thử lại"
          shape="bordered-card"
          iconSize={12}
          titleClassName="mt-4 font-bold text-base text-foreground"
          descriptionClassName="mt-2 max-w-sm text-edu-text-secondary text-sm"
          onRetry={vi.fn()}
        />,
      );
      expect(classesOf(html, 2)).toEqual(
        setOf("mt-4 font-bold text-base text-foreground"),
      );
      expect(classesOf(html, 3)).toEqual(
        setOf("mt-2 max-w-sm text-edu-text-secondary text-sm"),
      );
      expect(html).not.toContain("font-extrabold");
      expect(html).not.toContain("text-muted-foreground");
    });
  });
});
