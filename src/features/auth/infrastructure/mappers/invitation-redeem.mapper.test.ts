/**
 * Unit tests — invitation lookup/redeem wire↔domain mapping (US-E18.53,
 * IAM US-191).
 *
 * WIRE-CASE GROUND TRUTH: IAM's HTTP boundary is
 * `pkg/kit/response.WriteError`, whose `codeFromKey()` **uppercases** the Go
 * i18n key (`invitation_invalid` → `INVITATION_INVALID`), so the real
 * `error.code` is UPPER_SNAKE. `openapi.yaml` documents the same UPPER_SNAKE
 * form. The sibling `iam-member.repository` mapper (US-E18.6) matches the
 * LOWERCASE key instead — the two cannot both be right, so this mapper accepts
 * EITHER casing and is additionally backed by an HTTP-status fallback. That is
 * deliberate defensiveness on a public account-creation surface, not
 * indecision; the discrepancy is flagged to `fe-lead` in the story evidence.
 */
import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import {
  mapInvitationPreview,
  mapInvitationRedeemFailure,
  mapRedeemedInvitation,
} from "./invitation-redeem.mapper";

function apiError(
  code: string,
  over: {
    status?: number;
    retryAfterSeconds?: number;
    fields?: Array<{ field: string; message: string }>;
  } = {},
): ApiError {
  return new ApiError({
    code,
    message: `mock ${code}`,
    retryable: false,
    ...over,
  });
}

describe("mapInvitationPreview", () => {
  it("maps the four LookupInvitationResponse fields 1:1, keeping the RAW wire role enum", () => {
    expect(
      mapInvitationPreview({
        email: "lan.pham@nguyendu.edu.vn",
        tenantName: "THPT Nguyễn Du",
        roles: ["TEACHER", "STAFF"],
        expiresAt: "2026-08-14T02:00:00Z",
      }),
    ).toEqual({
      email: "lan.pham@nguyendu.edu.vn",
      tenantName: "THPT Nguyễn Du",
      roles: ["TEACHER", "STAFF"],
      expiresAt: "2026-08-14T02:00:00Z",
    });
  });

  it("a missing roles[] becomes an empty array, never undefined (the preview line iterates it)", () => {
    const preview = mapInvitationPreview({
      email: "a@b.c",
      tenantName: "X",
      expiresAt: "2026-08-14T02:00:00Z",
    } as never);
    expect(preview.roles).toEqual([]);
  });
});

describe("mapRedeemedInvitation", () => {
  it("maps member + tokens through the EXISTING member/token mappers (no parallel token shape)", () => {
    expect(
      mapRedeemedInvitation({
        member: {
          tenantId: "t-9",
          userId: "u-9",
          roles: ["TEACHER"],
          status: "ACTIVE",
        },
        tokens: {
          accessToken: "a",
          refreshToken: "r",
          tokenType: "Bearer",
          sessionId: "s",
        },
      }),
    ).toEqual({
      member: {
        tenantId: "t-9",
        userId: "u-9",
        roles: ["TEACHER"],
        status: "ACTIVE",
      },
      tokens: { accessToken: "a", refreshToken: "r", sessionId: "s" },
    });
  });

  it("drops `tokenType` — it is a wire constant, not session state we persist", () => {
    const out = mapRedeemedInvitation({
      member: {
        tenantId: "t",
        userId: "u",
        roles: [],
        status: "ACTIVE",
      },
      tokens: {
        accessToken: "a",
        refreshToken: "r",
        tokenType: "Bearer",
        sessionId: "s",
      },
    });
    expect(out.tokens).not.toHaveProperty("tokenType");
  });
});

describe("mapInvitationRedeemFailure — code branches (UPPER_SNAKE, the real wire)", () => {
  it.each([
    ["INVITATION_INVALID", { type: "link-invalid" }],
    ["INVITATION_EXPIRED", { type: "link-expired" }],
    ["INVITATION_ACCOUNT_EXISTS", { type: "account-exists" }],
    ["FORBIDDEN_ACTION", { type: "tenant-inactive" }],
    ["NETWORK_ERROR", { type: "network-error" }],
  ])("%s → %o", (code, expected) => {
    expect(mapInvitationRedeemFailure(apiError(code))).toEqual(expected);
  });

  it("accepts the lowercase Go i18n key too (defensive against the documented casing drift)", () => {
    expect(mapInvitationRedeemFailure(apiError("invitation_expired"))).toEqual({
      type: "link-expired",
    });
  });

  it("USER_WEAK_PASSWORD (400, the policy backstop) → invalid-input[passwordWeak]", () => {
    expect(
      mapInvitationRedeemFailure(
        apiError("USER_WEAK_PASSWORD", { status: 400 }),
      ),
    ).toEqual({ type: "invalid-input", issues: ["passwordWeak"] });
  });

  it("RATE_LIMIT_EXCEEDED carries the Retry-After seconds when the response sent one", () => {
    expect(
      mapInvitationRedeemFailure(
        apiError("RATE_LIMIT_EXCEEDED", { status: 429, retryAfterSeconds: 60 }),
      ),
    ).toEqual({ type: "rate-limited", retryAfterSeconds: 60 });
  });

  it("RATE_LIMIT_EXCEEDED without the header omits the field (copy falls back to the wait-less variant)", () => {
    expect(
      mapInvitationRedeemFailure(
        apiError("RATE_LIMIT_EXCEEDED", { status: 429 }),
      ),
    ).toEqual({ type: "rate-limited", retryAfterSeconds: undefined });
  });
});

describe("mapInvitationRedeemFailure — 422 VALIDATION_FAILED field mapping", () => {
  it("maps each blamed field to its own issue key", () => {
    expect(
      mapInvitationRedeemFailure(
        apiError("VALIDATION_FAILED", {
          status: 422,
          fields: [
            { field: "password", message: "min 8" },
            { field: "fullName", message: "required" },
          ],
        }),
      ),
    ).toEqual({
      type: "invalid-input",
      issues: ["passwordInvalid", "fullNameInvalid"],
    });
  });

  it("a 422 blaming `token` is a dead LINK, not a form error — the form must not show a field error the user cannot fix", () => {
    expect(
      mapInvitationRedeemFailure(
        apiError("VALIDATION_FAILED", {
          status: 422,
          fields: [{ field: "token", message: "required" }],
        }),
      ),
    ).toEqual({ type: "link-invalid" });
  });

  it("a 422 with no fields[] still lands on invalid-input with an empty issue list (generic form error, never a crash)", () => {
    expect(
      mapInvitationRedeemFailure(
        apiError("VALIDATION_FAILED", { status: 422 }),
      ),
    ).toEqual({ type: "invalid-input", issues: [] });
  });

  it("an unrecognised field name is dropped rather than rendered raw", () => {
    expect(
      mapInvitationRedeemFailure(
        apiError("VALIDATION_FAILED", {
          status: 422,
          fields: [{ field: "somethingNew", message: "?" }],
        }),
      ),
    ).toEqual({ type: "invalid-input", issues: [] });
  });
});

describe("mapInvitationRedeemFailure — status fallback (unknown code)", () => {
  it.each([
    [409, { type: "account-exists" }],
    [410, { type: "link-invalid" }],
    [422, { type: "invalid-input", issues: [] }],
    [429, { type: "rate-limited", retryAfterSeconds: undefined }],
    [403, { type: "tenant-inactive" }],
  ])("status %i with an unmapped code → %o", (status, expected) => {
    expect(
      mapInvitationRedeemFailure(apiError("SOMETHING_NEW", { status })),
    ).toEqual(expected);
  });

  it("an unmapped code with a 500 stays `unknown` — never guessed into an actionable state", () => {
    expect(
      mapInvitationRedeemFailure(apiError("SOMETHING_NEW", { status: 500 })),
    ).toEqual({ type: "unknown" });
  });

  it("a non-ApiError throw is `unknown`", () => {
    expect(mapInvitationRedeemFailure(new Error("boom"))).toEqual({
      type: "unknown",
    });
  });
});
