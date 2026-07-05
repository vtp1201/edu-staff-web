import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DetailPanelHeader } from "./detail-panel-header";

/**
 * DetailPanelHeader is a presentational shared component. This repo's Vitest
 * toolchain runs in `node` env with NO @testing-library/react, so structural /
 * a11y-attribute proof lives here via `renderToStaticMarkup` (string asserts).
 *
 * Interaction proof (click + Enter/Space call `onBack` exactly once, 375px
 * label collapse) lives in the Storybook `play` interaction tests
 * (detail-panel-header.stories.tsx) which run in the browser — see AC-E17.9-12
 * / 14 / 15 / 09. Static markup discards event handlers, so click/keyboard
 * cannot be exercised in node env.
 */
const LONG_LABEL = "Quay lại danh sách thông báo rất là dài không bị cắt";

describe("DetailPanelHeader", () => {
  it("renders back button with aria-label exactly equal to backLabel (untruncated)", () => {
    const html = renderToStaticMarkup(
      <DetailPanelHeader
        backLabel={LONG_LABEL}
        onBack={() => {}}
        title="Một tiêu đề rất dài dài dài dài dài để kiểm tra cắt chuỗi"
      />,
    );
    expect(html).toContain(`aria-label="${LONG_LABEL}"`);
  });

  it("back button has 44x44 minimum touch target classes", () => {
    const html = renderToStaticMarkup(
      <DetailPanelHeader backLabel="Quay lại" onBack={() => {}} />,
    );
    expect(html).toContain("min-h-[44px]");
    expect(html).toContain("min-w-[44px]");
  });

  it("back button uses ghost variant and renders ChevronLeft icon before the label text", () => {
    const html = renderToStaticMarkup(
      <DetailPanelHeader backLabel="Quay lại" onBack={() => {}} />,
    );
    expect(html).toContain('data-variant="ghost"');
    // Lucide ChevronLeft emits an svg with the chevron-left class.
    const iconIdx = html.indexOf("chevron-left");
    // the VISIBLE label is a text node inside the truncate span (">Quay lại<"),
    // distinct from the earlier aria-label="Quay lại" attribute occurrence.
    const labelIdx = html.indexOf(">Quay lại<");
    expect(iconIdx).toBeGreaterThanOrEqual(0);
    expect(labelIdx).toBeGreaterThanOrEqual(0);
    // icon appears before the visible label text
    expect(iconIdx).toBeLessThan(labelIdx);
  });

  it("renders only the back button when title and actions are absent (no crash)", () => {
    const html = renderToStaticMarkup(
      <DetailPanelHeader backLabel="Quay lại" onBack={() => {}} />,
    );
    expect(html).toContain('aria-label="Quay lại"');
    // no actions container node beyond the empty center spacer
    expect(html).not.toContain("Chỉnh sửa");
  });

  it("renders title in the center zone with text-base font-bold text-foreground + truncate", () => {
    const html = renderToStaticMarkup(
      <DetailPanelHeader
        backLabel="Quay lại"
        onBack={() => {}}
        title="Thông báo quan trọng"
      />,
    );
    expect(html).toContain("Thông báo quan trọng");
    expect(html).toContain("text-base");
    expect(html).toContain("font-bold");
    expect(html).toContain("text-foreground");
    expect(html).toContain("truncate");
  });

  it("renders the passed actions node in the right zone", () => {
    const html = renderToStaticMarkup(
      <DetailPanelHeader
        backLabel="Quay lại"
        onBack={() => {}}
        actions={
          <button type="button" aria-label="Chỉnh sửa tên">
            <span className="sr-only md:not-sr-only">Chỉnh sửa</span>
          </button>
        }
      />,
    );
    expect(html).toContain('aria-label="Chỉnh sửa tên"');
    expect(html).toContain("Chỉnh sửa");
  });
});
