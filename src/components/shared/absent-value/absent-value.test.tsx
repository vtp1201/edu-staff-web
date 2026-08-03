import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AbsentValue } from "./absent-value";

/**
 * Canonical "this value is not available" marker (US-E18.35 promotion of
 * `admin-roster`'s `MissingValue` + `moderation`'s `UnavailableValue`, decision
 * 0026).
 *
 * The repo's vitest env is `node`, so we assert the rendered markup: the glyph
 * must stay decorative and the MEANING must live in text an assistive tech can
 * read (accessibility.md — meaning is never carried by a glyph alone).
 */
describe("AbsentValue", () => {
  it("renders the em dash as decorative and the caller's label as sr-only text", () => {
    const html = renderToStaticMarkup(<AbsentValue label="Chưa cập nhật" />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("—");
    expect(html).toContain('class="sr-only"');
    expect(html).toContain("Chưa cập nhật");
  });

  it("takes the label as a prop so each feature keeps its own copy", () => {
    // The two promoted call sites say DIFFERENT things about the same shape.
    expect(
      renderToStaticMarkup(<AbsentValue label="Không có dữ liệu" />),
    ).toContain("Không có dữ liệu");
  });

  it("tones the marker with the muted-foreground token (never a raw colour)", () => {
    const html = renderToStaticMarkup(<AbsentValue label="Chưa cập nhật" />);

    expect(html).toContain("text-muted-foreground");
  });
});
