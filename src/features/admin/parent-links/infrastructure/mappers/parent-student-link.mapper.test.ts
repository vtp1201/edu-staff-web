import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { LinkCandidateResponseDto } from "../dtos/link-candidate-response.dto";
import type { ParentStudentConsentResponseDto } from "../dtos/parent-student-consent-response.dto";
import type { ParentStudentLinkResponseDto } from "../dtos/parent-student-link-response.dto";
import {
  toFailure,
  toLinkCandidate,
  toParentStudentConsent,
  toParentStudentLink,
} from "./parent-student-link.mapper";

describe("toParentStudentLink", () => {
  it("flattens the nested wire DTO into the flat entity", () => {
    const dto: ParentStudentLinkResponseDto = {
      linkId: "l1",
      student: {
        memberId: "st1",
        fullName: "Nguyễn Minh Khoa",
        avatarUrl: null,
        className: "11A2",
      },
      parent: {
        memberId: "pa1",
        fullName: "Nguyễn Văn Bình",
        phone: "0912 345 678",
      },
      relationship: "father",
      consentStatus: "agreed",
      note: null,
      linkedOn: "2025-08-12",
    };

    expect(toParentStudentLink(dto)).toEqual({
      linkId: "l1",
      studentId: "st1",
      studentName: "Nguyễn Minh Khoa",
      studentAvatarUrl: undefined,
      studentClassName: "11A2",
      parentId: "pa1",
      parentName: "Nguyễn Văn Bình",
      parentAvatarUrl: undefined,
      parentPhone: "0912 345 678",
      relationship: "father",
      note: undefined,
      consentStatus: "agreed",
      linkedOn: "2025-08-12",
    });
  });

  it("preserves a present note + avatar", () => {
    const dto: ParentStudentLinkResponseDto = {
      linkId: "l4",
      student: {
        memberId: "st4",
        fullName: "Lê Thảo Vy",
        avatarUrl: "https://x/a.png",
        className: "10C3",
      },
      parent: {
        memberId: "pa3",
        fullName: "Lê Văn Hùng",
        avatarUrl: "https://x/b.png",
        phone: "0903 222 111",
      },
      relationship: "guardian",
      consentStatus: "declined",
      note: "Người giám hộ hợp pháp.",
      linkedOn: "2025-09-05",
    };

    const e = toParentStudentLink(dto);
    expect(e.note).toBe("Người giám hộ hợp pháp.");
    expect(e.studentAvatarUrl).toBe("https://x/a.png");
    expect(e.parentAvatarUrl).toBe("https://x/b.png");
  });
});

describe("toParentStudentConsent / toLinkCandidate", () => {
  it("maps the consent DTO 1:1", () => {
    const dto: ParentStudentConsentResponseDto = {
      studentId: "st1",
      parentId: "pa1",
      disciplineAlerts: true,
      absenceAlerts: false,
      gradeAlerts: true,
    };
    expect(toParentStudentConsent(dto)).toEqual(dto);
  });

  it("coerces null candidate fields to undefined", () => {
    const dto: LinkCandidateResponseDto = {
      memberId: "st1",
      fullName: "Nguyễn Minh Khoa",
      avatarUrl: null,
      className: "11A2",
      phone: null,
    };
    expect(toLinkCandidate(dto)).toEqual({
      memberId: "st1",
      fullName: "Nguyễn Minh Khoa",
      avatarUrl: undefined,
      className: "11A2",
      phone: undefined,
    });
  });
});

describe("toFailure — branch on code, never message", () => {
  it("maps LINK_ALREADY_EXISTS → already-linked", () => {
    expect(
      toFailure(
        new ApiError({
          code: "LINK_ALREADY_EXISTS",
          message: "x",
          retryable: false,
          status: 409,
        }),
      ),
    ).toEqual({ type: "already-linked" });
  });

  it("maps VALIDATION_ERROR → validation with fields", () => {
    const res = toFailure(
      new ApiError({
        code: "VALIDATION_ERROR",
        message: "x",
        retryable: false,
        status: 422,
        fields: [{ field: "parentId", message: "not-parent-role" }],
      }),
    );
    expect(res).toEqual({
      type: "validation",
      fields: [{ field: "parentId", message: "not-parent-role" }],
    });
  });

  it("maps RESOURCE_NOT_FOUND → not-found", () => {
    expect(
      toFailure(
        new ApiError({
          code: "RESOURCE_NOT_FOUND",
          message: "x",
          retryable: false,
          status: 404,
        }),
      ),
    ).toEqual({ type: "not-found" });
  });

  it("maps FORBIDDEN_ACTION → forbidden", () => {
    expect(
      toFailure(
        new ApiError({
          code: "FORBIDDEN_ACTION",
          message: "x",
          retryable: false,
          status: 403,
        }),
      ),
    ).toEqual({ type: "forbidden" });
  });

  it("maps NETWORK_ERROR / no status → network-error", () => {
    expect(
      toFailure(
        new ApiError({ code: "NETWORK_ERROR", message: "x", retryable: true }),
      ),
    ).toEqual({ type: "network-error" });
  });

  // HIGH-RISK discipline (spec.md §"High-Risk", plan.md Phase 2): a misleading
  // message must NOT override the code. A 403 whose message literally says
  // "not found" must still map to `forbidden`, not `not-found` — otherwise the
  // UI would offer a benign "already removed" toast for a real authorization
  // rejection, hiding the security event (AC-005.6).
  it("ignores a misleading message and branches on code only", () => {
    const forbiddenWithNotFoundMessage = new ApiError({
      code: "FORBIDDEN_ACTION",
      message: "resource not found — please retry", // deliberately misleading
      retryable: true, // deliberately misleading
      status: 403,
    });
    expect(toFailure(forbiddenWithNotFoundMessage)).toEqual({
      type: "forbidden",
    });

    const notFoundWithForbiddenMessage = new ApiError({
      code: "RESOURCE_NOT_FOUND",
      message: "forbidden action for this role", // deliberately misleading
      retryable: false,
      status: 404,
    });
    expect(toFailure(notFoundWithForbiddenMessage)).toEqual({
      type: "not-found",
    });
  });
});
