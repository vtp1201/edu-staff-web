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
  it("maps the DTO to the entity", () => {
    const dto: LinkedStudentResponseDto = {
      studentId: "st1",
      fullName: "Nguyễn Minh Khoa",
      avatarUrl: "https://cdn/x.png",
      linkId: "l1",
    };
    expect(toLinkedStudentSummary(dto)).toEqual({
      studentId: "st1",
      fullName: "Nguyễn Minh Khoa",
      avatarUrl: "https://cdn/x.png",
      linkId: "l1",
    });
  });

  it("maps a null/absent avatarUrl to undefined", () => {
    const dto: LinkedStudentResponseDto = {
      studentId: "st2",
      fullName: "Trần Quốc Bảo",
      avatarUrl: null,
      linkId: "l2",
    };
    expect(toLinkedStudentSummary(dto).avatarUrl).toBeUndefined();
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
