import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ListSkeleton } from "./list-skeleton";

/**
 * `ListSkeleton` is the canonical list-loading placeholder
 * (INFRA-shared-list-states). DOM structure is proven here via
 * react-dom/server static markup (this repo's Vitest runs in node env — no
 * @testing-library/react); interaction/play() coverage lives in
 * list-skeleton.stories.tsx.
 *
 * The `classesOf` parity assertions below are the "zero visual change" proof for
 * the refactor: each expected set is the literal class list of the DELETED
 * feature-local component this one replaces.
 */
const row = (index: number) => <div data-row={index}>row</div>;

/** Class tokens of the nth element carrying a class attribute, order-insensitive. */
function classesOf(html: string, nth = 0): Set<string> {
  const matches = [...html.matchAll(/class="([^"]*)"/g)];
  return new Set((matches[nth]?.[1] ?? "").split(" ").filter(Boolean));
}

describe("ListSkeleton", () => {
  describe("inline variant (Family A — SD/SA)", () => {
    const html = renderToStaticMarkup(
      <ListSkeleton
        loadingAriaLabel="Đang tải dữ liệu"
        rows={4}
        variant="inline"
        renderRow={row}
      />,
    );

    it("puts role=status + aria-busy on the outer element itself", () => {
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
    });

    it("announces the already-translated label in an sr-only span", () => {
      expect(html).toContain('class="sr-only"');
      expect(html).toContain("Đang tải dữ liệu");
    });

    it("renders exactly `rows` rows, passing each index to renderRow", () => {
      expect(html.match(/data-row=/g)).toHaveLength(4);
      expect(html).toContain('data-row="0"');
      expect(html).toContain('data-row="3"');
    });

    it("does NOT aria-hide the rows (only the bordered variant does)", () => {
      expect(html).not.toContain('aria-hidden="true"');
    });

    it("keeps the deleted SDListSkeleton/SAListSkeleton wrapper classes", () => {
      expect(classesOf(html)).toEqual(
        new Set(
          "divide-y divide-border overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card".split(
            " ",
          ),
        ),
      );
    });
  });

  describe("bordered variant (Family B — parent-links/invitations)", () => {
    const html = renderToStaticMarkup(
      <ListSkeleton
        loadingAriaLabel="Đang tải danh sách"
        rows={5}
        variant="bordered"
        renderRow={row}
      />,
    );

    it("moves role=status to a visually-hidden sibling, no aria-busy", () => {
      expect(html).toContain('<span class="sr-only" role="status">');
      expect(html).not.toContain("aria-busy");
    });

    it("hides the shimmer block from the a11y tree", () => {
      expect(html).toContain('<div aria-hidden="true">');
    });

    it("renders exactly `rows` rows", () => {
      expect(html.match(/data-row=/g)).toHaveLength(5);
    });

    it("keeps the deleted PLSkeleton/InvitationsSkeleton wrapper classes", () => {
      expect(classesOf(html)).toEqual(
        new Set("rounded-xl border border-border bg-card p-2".split(" ")),
      );
    });
  });

  it("merges a custom className onto the outer wrapper", () => {
    const html = renderToStaticMarkup(
      <ListSkeleton
        loadingAriaLabel="Đang tải"
        rows={1}
        variant="bordered"
        renderRow={row}
        className="my-custom-class"
      />,
    );
    expect(classesOf(html).has("my-custom-class")).toBe(true);
  });

  it("renders no rows when rows is 0 (still announces loading)", () => {
    const html = renderToStaticMarkup(
      <ListSkeleton
        loadingAriaLabel="Đang tải"
        rows={0}
        variant="inline"
        renderRow={row}
      />,
    );
    expect(html).not.toContain("data-row=");
    expect(html).toContain("Đang tải");
  });
});
