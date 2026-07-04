import { Inbox, Plus } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./empty-state";

/**
 * EmptyState is the canonical `emptyStatePattern` (design-spec.jsonc) shared
 * component. DOM structure is proven here via react-dom/server static markup
 * (this repo's Vitest runs in node env — no @testing-library/react); the
 * interaction/play() coverage lives in empty-state.stories.tsx.
 */
describe("EmptyState", () => {
  it("renders a role=status container with the title as a <p>", () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={Inbox} title="Không có dữ liệu" />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("<p");
    expect(html).toContain("Không có dữ liệu");
  });

  it("renders the icon as aria-hidden and 64px (size-16)", () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={Inbox} title="Trống" />,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("size-16");
    expect(html).toContain("text-edu-text-muted");
  });

  it("does NOT render a <button> when no cta is passed (no-CTA variant)", () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={Inbox} title="Trống" />,
    );
    expect(html).not.toContain("<button");
  });

  it("does NOT introduce heading hierarchy (<h2>/<h3>) inside the container", () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={Inbox} title="Trống" />,
    );
    expect(html).not.toContain("<h2");
    expect(html).not.toContain("<h3");
  });

  it("renders the optional body only when provided", () => {
    const without = renderToStaticMarkup(
      <EmptyState icon={Inbox} title="Trống" />,
    );
    expect(without).not.toContain("mô tả phụ");

    const withBody = renderToStaticMarkup(
      <EmptyState icon={Inbox} title="Trống" body="mô tả phụ" />,
    );
    expect(withBody).toContain("mô tả phụ");
    expect(withBody).toContain("max-w-xs");
  });

  it("renders a <button> with the cta label when a cta is provided", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        icon={Inbox}
        title="Trống"
        cta={{ label: "Thêm mới", icon: Plus, onClick: vi.fn() }}
      />,
    );
    expect(html).toContain("<button");
    expect(html).toContain("Thêm mới");
  });

  it("merges a custom className onto the outer container", () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={Inbox} title="Trống" className="my-custom-class" />,
    );
    expect(html).toContain("my-custom-class");
  });
});
