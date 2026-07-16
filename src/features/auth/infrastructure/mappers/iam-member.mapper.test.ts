import { describe, expect, it } from "vitest";
import type { MembershipSummaryDto } from "../dtos/iam-member-response.dto";
import { mapMembershipSummary } from "./iam-member.mapper";

describe("mapMembershipSummary", () => {
  it("maps the real MembershipSummary wire shape 1:1 (no tenantName on the wire, US-E18.6)", () => {
    const dto: MembershipSummaryDto = {
      tenantId: "t-1",
      roles: ["ADMIN", "TEACHER"],
      status: "ACTIVE",
    };
    expect(mapMembershipSummary(dto)).toEqual({
      tenantId: "t-1",
      roles: ["ADMIN", "TEACHER"],
      status: "ACTIVE",
    });
  });

  it("passes through a non-ACTIVE status verbatim", () => {
    const dto: MembershipSummaryDto = {
      tenantId: "t-2",
      roles: ["PARENT"],
      status: "SUSPENDED",
    };
    expect(mapMembershipSummary(dto).status).toBe("SUSPENDED");
  });
});
