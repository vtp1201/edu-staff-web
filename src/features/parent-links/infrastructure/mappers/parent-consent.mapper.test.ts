import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { LinkedStudentResponseDto } from "../dtos/linked-student-response.dto";
import type { ParentStudentConsentResponseDto } from "../dtos/parent-student-consent-response.dto";
import {
  toConsentFailure,
  toLinkedStudentSummary,
  toParentStudentConsent,
} from "./parent-consent.mapper";

describe("toLinkedStudentSummary", () => {
  const dto: LinkedStudentResponseDto = {
    linkId: "l1",
    parentMemberId: "p1",
    studentMemberId: "st1",
    className: "12A2",
  };

  it("keys the child by studentMemberId (the wire's own field)", () => {
    expect(toLinkedStudentSummary(dto).studentId).toBe("st1");
    expect(toLinkedStudentSummary(dto).linkId).toBe("l1");
  });

  it("prefers the name BE resolved on the row (ask #12)", () => {
    expect(
      toLinkedStudentSummary({ ...dto, studentName: "Hoàng Thanh Oanh" })
        .fullName,
    ).toBe("Hoàng Thanh Oanh");
  });

  it("falls back to the IAM lookup when BE could not resolve one", () => {
    const names = new Map([["st1", "Nguyễn Minh Khoa"]]);
    expect(toLinkedStudentSummary(dto, names).fullName).toBe(
      "Nguyễn Minh Khoa",
    );
  });

  it("falls back to the class label, then the id, rather than rendering blank", () => {
    expect(toLinkedStudentSummary(dto).fullName).toBe("12A2");
    expect(
      toLinkedStudentSummary({ ...dto, className: undefined }).fullName,
    ).toBe("st1");
  });
});

describe("toParentStudentConsent", () => {
  it("maps the DTO to the entity", () => {
    const dto: ParentStudentConsentResponseDto = {
      studentId: "st1",
      parentId: "self",
      disciplineAlerts: true,
      absenceAlerts: false,
      gradeAlerts: true,
    };
    expect(toParentStudentConsent(dto)).toEqual(dto);
  });
});

describe("toConsentFailure", () => {
  it("maps 403 / FORBIDDEN_ACTION to forbidden", () => {
    const err = new ApiError({
      code: "FORBIDDEN_ACTION",
      message: "no",
      retryable: false,
      status: 403,
    });
    expect(toConsentFailure(err)).toEqual({ type: "forbidden" });
  });

  it("maps 422 / VALIDATION_ERROR to validation with fields", () => {
    const err = new ApiError({
      code: "VALIDATION_ERROR",
      message: "bad",
      retryable: false,
      status: 422,
      fields: [{ field: "grades", message: "invalid" }],
    });
    expect(toConsentFailure(err)).toEqual({
      type: "validation",
      fields: [{ field: "grades", message: "invalid" }],
    });
  });

  it("maps NETWORK_ERROR / unknown status to network-error", () => {
    const err = new ApiError({
      code: "NETWORK_ERROR",
      message: "x",
      retryable: true,
    });
    expect(toConsentFailure(err)).toEqual({ type: "network-error" });
  });

  it("defaults anything else to network-error", () => {
    const err = new ApiError({
      code: "TEAPOT",
      message: "x",
      retryable: false,
      status: 418,
    });
    expect(toConsentFailure(err)).toEqual({ type: "network-error" });
  });
});
