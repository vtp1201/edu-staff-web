import { describe, expect, it, vi } from "vitest";
import type { LinkAuditEntry } from "../entities/link-audit-entry.entity";
import type { LinkCandidate } from "../entities/link-candidate.entity";
import type { ParentStudentConsent } from "../entities/parent-student-consent.entity";
import type { IParentStudentLinkRepository } from "../repositories/i-parent-student-link.repository";
import { GetLinkAuditTrailUseCase } from "./get-link-audit-trail.use-case";
import { GetLinkConsentDetailUseCase } from "./get-link-consent-detail.use-case";
import { ListParentStudentLinksUseCase } from "./list-parent-student-links.use-case";
import { fail, ok } from "./result";
import { SearchParentCandidatesUseCase } from "./search-parent-candidates.use-case";
import { SearchStudentCandidatesUseCase } from "./search-student-candidates.use-case";

function makeRepo(
  overrides: Partial<IParentStudentLinkRepository> = {},
): IParentStudentLinkRepository {
  return {
    listLinks: vi.fn(),
    createLink: vi.fn(),
    unlinkLink: vi.fn(),
    getLinkConsentDetail: vi.fn(),
    getLinkAuditTrail: vi.fn(),
    searchStudentCandidates: vi.fn(),
    searchParentCandidates: vi.fn(),
    ...overrides,
  };
}

describe("ListParentStudentLinksUseCase", () => {
  it("passes the filter through and returns the page", async () => {
    const page = { items: [], nextCursor: null, hasMore: false };
    const listLinks = vi.fn().mockResolvedValue(ok(page));
    const uc = new ListParentStudentLinksUseCase(makeRepo({ listLinks }));

    const res = await uc.execute({ q: "khoa", classId: "11A2" });

    expect(res).toEqual(ok(page));
    expect(listLinks).toHaveBeenCalledWith({ q: "khoa", classId: "11A2" });
  });

  it("propagates a network-error failure", async () => {
    const listLinks = vi
      .fn()
      .mockResolvedValue(fail({ type: "network-error" }));
    const uc = new ListParentStudentLinksUseCase(makeRepo({ listLinks }));

    const res = await uc.execute({});

    expect(res).toEqual(fail({ type: "network-error" }));
  });
});

describe("GetLinkConsentDetailUseCase", () => {
  it("returns the consent record", async () => {
    const consent: ParentStudentConsent = {
      studentId: "st1",
      parentId: "pa1",
      disciplineAlerts: true,
      absenceAlerts: false,
      gradeAlerts: true,
    };
    const getLinkConsentDetail = vi.fn().mockResolvedValue(ok(consent));
    const uc = new GetLinkConsentDetailUseCase(
      makeRepo({ getLinkConsentDetail }),
    );

    const res = await uc.execute("st1", "pa1");

    expect(res).toEqual(ok(consent));
    expect(getLinkConsentDetail).toHaveBeenCalledWith("st1", "pa1");
  });
});

describe("GetLinkAuditTrailUseCase (US-E20.3, pure delegate)", () => {
  const entry: LinkAuditEntry = {
    entryId: "ae-1",
    linkId: "l6",
    action: "created",
    actorId: "admin-seed",
    actorName: "Quản trị viên demo",
    occurredAt: "2025-11-01T03:00:00.000Z",
    note: "Tái tạo liên kết sau khi xác minh lại giấy tờ giám hộ.",
  };

  it("forwards linkId and returns the repository's entries verbatim", async () => {
    const getLinkAuditTrail = vi.fn().mockResolvedValue(ok([entry]));
    const uc = new GetLinkAuditTrailUseCase(makeRepo({ getLinkAuditTrail }));

    const res = await uc.execute("l6");

    expect(res).toEqual(ok([entry]));
    expect(getLinkAuditTrail).toHaveBeenCalledWith("l6");
    expect(getLinkAuditTrail).toHaveBeenCalledOnce();
  });

  it("returns the honest empty trail as ok([]) (INT-105 — no not-found)", async () => {
    const getLinkAuditTrail = vi.fn().mockResolvedValue(ok([]));
    const uc = new GetLinkAuditTrailUseCase(makeRepo({ getLinkAuditTrail }));

    expect(await uc.execute("never-existed")).toEqual(ok([]));
  });

  it("propagates a network-error failure unchanged", async () => {
    const getLinkAuditTrail = vi
      .fn()
      .mockResolvedValue(fail({ type: "network-error" }));
    const uc = new GetLinkAuditTrailUseCase(makeRepo({ getLinkAuditTrail }));

    expect(await uc.execute("l6")).toEqual(fail({ type: "network-error" }));
  });
});

describe("Search use-cases", () => {
  const candidate: LinkCandidate = {
    memberId: "st1",
    fullName: "Nguyễn Minh Khoa",
    className: "11A2",
  };

  it("SearchStudentCandidates forwards q + classId", async () => {
    const searchStudentCandidates = vi.fn().mockResolvedValue(ok([candidate]));
    const uc = new SearchStudentCandidatesUseCase(
      makeRepo({ searchStudentCandidates }),
    );

    const res = await uc.execute("kh", "11A2");

    expect(res).toEqual(ok([candidate]));
    expect(searchStudentCandidates).toHaveBeenCalledWith("kh", "11A2");
  });

  it("SearchParentCandidates forwards q (parent-role scoping is server-side)", async () => {
    const parent: LinkCandidate = {
      memberId: "pa1",
      fullName: "Nguyễn Văn Bình",
      phone: "0912 345 678",
    };
    const searchParentCandidates = vi.fn().mockResolvedValue(ok([parent]));
    const uc = new SearchParentCandidatesUseCase(
      makeRepo({ searchParentCandidates }),
    );

    const res = await uc.execute("binh");

    expect(res).toEqual(ok([parent]));
    expect(searchParentCandidates).toHaveBeenCalledWith("binh");
  });
});
