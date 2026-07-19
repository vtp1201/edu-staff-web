import { describe, expect, it, vi } from "vitest";
import type { ParentStudentLink } from "../entities/parent-student-link.entity";
import type {
  AuthContext,
  CreateLinkInput,
  IParentStudentLinkRepository,
} from "../repositories/i-parent-student-link.repository";
import { CreateParentStudentLinkUseCase } from "./create-parent-student-link.use-case";
import { fail, ok } from "./result";

const authCtx: AuthContext = { role: "admin", tenantId: "tenant-acme" };

const validInput: CreateLinkInput = {
  studentId: "st1",
  parentId: "pa1",
  relationship: "father",
  note: "n",
};

const createdLink: ParentStudentLink = {
  linkId: "l-new",
  studentId: "st1",
  studentName: "Nguyễn Minh Khoa",
  studentClassName: "11A2",
  parentId: "pa1",
  parentName: "Nguyễn Văn Bình",
  parentPhone: "0912 345 678",
  relationship: "father",
  consentStatus: "pending",
  linkedOn: "2026-07-19",
};

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

describe("CreateParentStudentLinkUseCase", () => {
  it("returns ok with the created link (consentStatus pending)", async () => {
    const createLink = vi.fn().mockResolvedValue(ok(createdLink));
    const uc = new CreateParentStudentLinkUseCase(makeRepo({ createLink }));

    const res = await uc.execute(validInput, authCtx);

    expect(res).toEqual(ok(createdLink));
    expect(createLink).toHaveBeenCalledWith(validInput, authCtx);
  });

  it("maps a duplicate pair to already-linked (FR-004)", async () => {
    const createLink = vi
      .fn()
      .mockResolvedValue(fail({ type: "already-linked" }));
    const uc = new CreateParentStudentLinkUseCase(makeRepo({ createLink }));

    const res = await uc.execute(validInput, authCtx);

    expect(res).toEqual(fail({ type: "already-linked" }));
  });

  it("passes through a repo validation failure (422, e.g. parent not parent-role)", async () => {
    const failure = {
      type: "validation" as const,
      fields: [{ field: "parentId", message: "not-parent-role" }],
    };
    const createLink = vi.fn().mockResolvedValue(fail(failure));
    const uc = new CreateParentStudentLinkUseCase(makeRepo({ createLink }));

    const res = await uc.execute(validInput, authCtx);

    expect(res).toEqual(fail(failure));
  });

  it("passes through a network-error failure", async () => {
    const createLink = vi
      .fn()
      .mockResolvedValue(fail({ type: "network-error" }));
    const uc = new CreateParentStudentLinkUseCase(makeRepo({ createLink }));

    const res = await uc.execute(validInput, authCtx);

    expect(res).toEqual(fail({ type: "network-error" }));
  });

  it("short-circuits with validation when required fields are missing (no repo call)", async () => {
    const createLink = vi.fn();
    const uc = new CreateParentStudentLinkUseCase(makeRepo({ createLink }));

    const res = await uc.execute(
      { studentId: "", parentId: "", relationship: "father" },
      authCtx,
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.failure.type).toBe("validation");
      if (res.failure.type === "validation") {
        expect(res.failure.fields.map((f) => f.field)).toEqual([
          "studentId",
          "parentId",
        ]);
      }
    }
    expect(createLink).not.toHaveBeenCalled();
  });
});
