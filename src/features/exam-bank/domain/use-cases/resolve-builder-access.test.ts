import { describe, expect, it } from "vitest";
import { resolveBuilderAccess } from "./resolve-builder-access";

const base = {
  useMock: false,
  status: "draft" as const,
  authorId: "author-1",
  callerId: "author-1",
};

describe("resolveBuilderAccess (US-E18.28 edit-route gate)", () => {
  it("allows the author to edit their own DRAFT in real mode", () => {
    expect(resolveBuilderAccess(base)).toEqual({ allowed: true });
  });

  it("blocks a published paper as not-draft", () => {
    expect(resolveBuilderAccess({ ...base, status: "published" })).toEqual({
      allowed: false,
      reason: "not-draft",
    });
  });

  it("blocks a confidential paper as not-draft", () => {
    expect(resolveBuilderAccess({ ...base, status: "confidential" })).toEqual({
      allowed: false,
      reason: "not-draft",
    });
  });

  it("blocks another teacher's DRAFT as not-author", () => {
    expect(resolveBuilderAccess({ ...base, callerId: "someone-else" })).toEqual(
      {
        allowed: false,
        reason: "not-author",
      },
    );
  });

  it("blocks an unidentifiable caller as not-author (no token claim)", () => {
    expect(resolveBuilderAccess({ ...base, callerId: null })).toEqual({
      allowed: false,
      reason: "not-author",
    });
  });

  it("always allows in mock mode (no real caller identity to compare)", () => {
    expect(
      resolveBuilderAccess({
        ...base,
        useMock: true,
        status: "published",
        callerId: null,
      }),
    ).toEqual({ allowed: true });
  });
});
