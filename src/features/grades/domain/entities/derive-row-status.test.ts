import { describe, expect, it } from "vitest";
import { deriveRowStatus } from "./derive-row-status";
import type { GradeCell } from "./grade-sheet.entity";

function cell(value: number | null, status: GradeCell["status"]): GradeCell {
  return { value, status };
}

describe("deriveRowStatus", () => {
  it("returns empty when no cell has a value", () => {
    expect(
      deriveRowStatus({
        tx: cell(null, "DRAFT"),
        gk: cell(null, "DRAFT"),
      }),
    ).toBe("empty");
  });

  it("returns draft when at least one entered cell is DRAFT", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "DRAFT"),
        gk: cell(9, "PUBLISHED"),
      }),
    ).toBe("draft");
  });

  it("prioritizes draft over pending-approval (precedence)", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "DRAFT"),
        gk: cell(9, "PENDING_APPROVAL"),
        ck: cell(7, "LOCKED"),
      }),
    ).toBe("draft");
  });

  it("returns pending-approval when no DRAFT remains but one is pending", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "PENDING_APPROVAL"),
        gk: cell(9, "PUBLISHED"),
      }),
    ).toBe("pending-approval");
  });

  it("treats the dead SUBMITTED value as pending-approval", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "SUBMITTED"),
        gk: cell(9, "PUBLISHED"),
      }),
    ).toBe("pending-approval");
  });

  it("prioritizes pending-approval over published/locked", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "PENDING_APPROVAL"),
        gk: cell(9, "LOCKED"),
      }),
    ).toBe("pending-approval");
  });

  it("returns locked only when every entered cell is LOCKED", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "LOCKED"),
        gk: cell(9, "LOCKED"),
      }),
    ).toBe("locked");
  });

  it("does not return locked when one entered cell is still PUBLISHED", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "LOCKED"),
        gk: cell(9, "PUBLISHED"),
      }),
    ).toBe("published");
  });

  it("returns published when all entered cells are PUBLISHED", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "PUBLISHED"),
        gk: cell(9, "PUBLISHED"),
      }),
    ).toBe("published");
  });

  it("never lets an ungraded (null) column gate the status", () => {
    expect(
      deriveRowStatus({
        tx: cell(8, "LOCKED"),
        gk: cell(null, "DRAFT"),
      }),
    ).toBe("locked");
  });
});
