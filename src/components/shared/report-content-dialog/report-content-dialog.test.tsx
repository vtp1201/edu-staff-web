import { describe, expect, it } from "vitest";
import {
  isReportSubmittable,
  reasonRequiresNote,
} from "./report-content-dialog.logic";

/**
 * The repo's Vitest runs in `node` env (no jsdom / @testing-library) and Radix
 * portals do not render server-side, so the dialog's portal content is proven
 * in the Storybook interaction stories (browser env). The submit-enable /
 * "Khác"-requires-note validation contract (AC-1921.2 / AC-1921.3) is pure and
 * proven here — the component renders straight off these helpers.
 */
describe("reasonRequiresNote", () => {
  it('is true only for "other"', () => {
    expect(reasonRequiresNote("other")).toBe(true);
    expect(reasonRequiresNote("spam")).toBe(false);
    expect(reasonRequiresNote("inappropriate-language")).toBe(false);
    expect(reasonRequiresNote("bullying")).toBe(false);
    expect(reasonRequiresNote("misinformation")).toBe(false);
    expect(reasonRequiresNote(null)).toBe(false);
  });
});

describe("isReportSubmittable", () => {
  it("is false when no reason is chosen", () => {
    expect(isReportSubmittable(null, "")).toBe(false);
    expect(isReportSubmittable(null, "some note")).toBe(false);
  });

  it("is true for a non-other reason regardless of note (AC-1921.2)", () => {
    expect(isReportSubmittable("spam", "")).toBe(true);
    expect(isReportSubmittable("bullying", "")).toBe(true);
  });

  it('requires a non-empty trimmed note for "other" (AC-1921.3)', () => {
    expect(isReportSubmittable("other", "")).toBe(false);
    expect(isReportSubmittable("other", "   ")).toBe(false);
    expect(isReportSubmittable("other", "abuse")).toBe(true);
  });
});
