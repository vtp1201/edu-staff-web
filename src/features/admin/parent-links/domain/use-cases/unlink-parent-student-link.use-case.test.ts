import { describe, expect, it, vi } from "vitest";
import type {
  AuthContext,
  IParentStudentLinkRepository,
} from "../repositories/i-parent-student-link.repository";
import { fail, ok } from "./result";
import { UnlinkParentStudentLinkUseCase } from "./unlink-parent-student-link.use-case";

const adminCtx: AuthContext = { role: "admin", tenantId: "tenant-acme" };

function makeRepo(
  overrides: Partial<IParentStudentLinkRepository> = {},
): IParentStudentLinkRepository {
  return {
    listLinks: vi.fn(),
    createLink: vi.fn(),
    unlinkLink: vi.fn(),
    getLinkConsentDetail: vi.fn(),
    searchStudentCandidates: vi.fn(),
    searchParentCandidates: vi.fn(),
    ...overrides,
  };
}

describe("UnlinkParentStudentLinkUseCase", () => {
  it("returns ok on a valid admin unlink, forwarding authCtx", async () => {
    const unlinkLink = vi.fn().mockResolvedValue(ok(undefined));
    const uc = new UnlinkParentStudentLinkUseCase(makeRepo({ unlinkLink }));

    const res = await uc.execute("l1", adminCtx);

    expect(res).toEqual(ok(undefined));
    expect(unlinkLink).toHaveBeenCalledWith("l1", adminCtx);
  });

  it("propagates forbidden when the repo rejects a non-admin role (AC-005.5)", async () => {
    const unlinkLink = vi.fn().mockResolvedValue(fail({ type: "forbidden" }));
    const uc = new UnlinkParentStudentLinkUseCase(makeRepo({ unlinkLink }));

    const res = await uc.execute("l1", {
      role: "teacher",
      tenantId: "tenant-acme",
    });

    expect(res).toEqual(fail({ type: "forbidden" }));
  });

  it("propagates forbidden when the repo rejects a cross-tenant admin (AC-005.5)", async () => {
    const unlinkLink = vi.fn().mockResolvedValue(fail({ type: "forbidden" }));
    const uc = new UnlinkParentStudentLinkUseCase(makeRepo({ unlinkLink }));

    const res = await uc.execute("l1", {
      role: "admin",
      tenantId: "other-tenant",
    });

    expect(res).toEqual(fail({ type: "forbidden" }));
  });

  it("propagates not-found (404 race, AC-005.7)", async () => {
    const unlinkLink = vi.fn().mockResolvedValue(fail({ type: "not-found" }));
    const uc = new UnlinkParentStudentLinkUseCase(makeRepo({ unlinkLink }));

    const res = await uc.execute("missing", adminCtx);

    expect(res).toEqual(fail({ type: "not-found" }));
  });

  it("propagates network-error (AC-005.8)", async () => {
    const unlinkLink = vi
      .fn()
      .mockResolvedValue(fail({ type: "network-error" }));
    const uc = new UnlinkParentStudentLinkUseCase(makeRepo({ unlinkLink }));

    const res = await uc.execute("l1", adminCtx);

    expect(res).toEqual(fail({ type: "network-error" }));
  });
});
