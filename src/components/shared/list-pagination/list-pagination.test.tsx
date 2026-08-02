import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ListPagination } from "./list-pagination";

/**
 * `ListPagination` is the canonical prev/next pager promoted out of
 * `teacher-class-students-screen` + `teacher-students-roster-screen`
 * (component-organization.md, decision 0026 — the two copies were byte-identical
 * apart from the button size and the i18n namespace).
 *
 * This repo's Vitest runs in node env (no @testing-library/react), so DOM
 * structure is proven via react-dom/server static markup; click behaviour lives
 * in list-pagination.stories.tsx.
 */

const base = {
  page: 2,
  totalPages: 3,
  total: 25,
  pageSize: 10,
  pageRowCount: 10,
  onPageChange: vi.fn(),
  navLabel: "Phân trang danh sách học sinh",
  prevLabel: "Trang trước",
  nextLabel: "Trang sau",
  formatShowing: ({
    from,
    to,
    total,
  }: {
    from: number;
    to: number;
    total: number;
  }) => `Hiển thị ${from}–${to} trên ${total}`,
};

describe("ListPagination", () => {
  it("renders nothing when there is only one page", () => {
    expect(
      renderToStaticMarkup(
        <ListPagination
          {...base}
          page={1}
          totalPages={1}
          total={4}
          pageRowCount={4}
        />,
      ),
    ).toBe("");
  });

  it("labels the nav and announces the current page", () => {
    const html = renderToStaticMarkup(<ListPagination {...base} />);
    expect(html).toContain('aria-label="Phân trang danh sách học sinh"');
    expect(html).toContain("2 / 3");
    expect(html).toContain('aria-live="polite"');
  });

  it("derives the showing range from page/pageSize/pageRowCount", () => {
    const html = renderToStaticMarkup(<ListPagination {...base} />);
    expect(html).toContain("Hiển thị 11–20 trên 25");
  });

  it("derives a short last page range from pageRowCount", () => {
    const html = renderToStaticMarkup(
      <ListPagination {...base} page={3} pageRowCount={5} />,
    );
    expect(html).toContain("Hiển thị 21–25 trên 25");
  });

  it("disables prev on the first page and next on the last page", () => {
    const first = renderToStaticMarkup(<ListPagination {...base} page={1} />);
    expect(first).toMatch(/aria-label="Trang trước"[^>]*disabled/);
    expect(first).not.toMatch(/aria-label="Trang sau"[^>]*disabled/);

    const last = renderToStaticMarkup(<ListPagination {...base} page={3} />);
    expect(last).toMatch(/aria-label="Trang sau"[^>]*disabled/);
    expect(last).not.toMatch(/aria-label="Trang trước"[^>]*disabled/);
  });

  it("uses 44px touch targets (WCAG 2.5.5) for both page buttons", () => {
    const html = renderToStaticMarkup(<ListPagination {...base} />);
    const buttons = [...html.matchAll(/<button[^>]*class="([^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(buttons).toHaveLength(2);
    for (const cls of buttons) {
      expect(cls).toContain("size-11");
      expect(cls).not.toContain("size-9");
    }
  });

  it("uses the AA-contrast secondary text token for the showing label (A11Y-001)", () => {
    const html = renderToStaticMarkup(<ListPagination {...base} />);
    expect(html).toContain("text-edu-text-secondary");
    expect(html).not.toContain("text-edu-text-muted");
  });
});
