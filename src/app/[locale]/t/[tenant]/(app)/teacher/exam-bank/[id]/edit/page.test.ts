import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamBankDetail } from "@/features/exam-bank/domain/entities/exam-bank-detail.entity";

/**
 * QA (US-E18.28): `[id]/edit/page.tsx` is the ONE place `resolveBuilderAccess`
 * (unit-tested in isolation, `resolve-builder-access.test.ts`) is actually wired
 * against real inputs — `USE_MOCK`, `decodeSubClaim(token)`, and the loaded
 * `ExamBankDetail` — plus the `notFound()` catch and the real/mock prop wiring
 * (`reorderEnabled`/`metaEditable`/`requireCompleteQuestions`). None of that had
 * a route-level test before this file (only the pure policy function did).
 * `USE_MOCK` is a module-eval-time const read from `process.env`
 * (`src/bootstrap/lib/mock.ts`) — mock the module directly per test and
 * `vi.resetModules()` + dynamic re-import so each test gets a fresh read
 * (recipe from `lesson-plans/[id]/edit/page.test.ts`).
 */

const getDetailExec = vi.fn();
const listExec = vi.fn();
const getAccessToken = vi.fn();
const decodeSubClaim = vi.fn();

const DRAFT_OWNED: ExamBankDetail = {
  id: "ep-1",
  title: "Đề Toán",
  subjectId: "s-math",
  subjectName: "Toán",
  teacherId: "author-1",
  teacherName: "author-1",
  totalQuestions: 1,
  durationMinutes: 45,
  maxAttempts: 1,
  status: "draft",
  createdAt: "2026-07-01",
  questions: [],
};

function mockDiAndAuth(useMock: boolean) {
  vi.doMock("@/bootstrap/di/exam-bank.di", () => ({
    makeGetExamDetailUseCase: async () => ({ execute: getDetailExec }),
    makeListExamBankUseCase: async () => ({ execute: listExec }),
  }));
  vi.doMock("@/bootstrap/lib/mock", () => ({ USE_MOCK: useMock }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({ getAccessToken }));
  vi.doMock("@/bootstrap/lib/jwt", () => ({ decodeSubClaim }));
  vi.doMock("./actions", () => ({
    saveDraftAction: vi.fn(),
    publishExamAction: vi.fn(),
  }));
}

async function renderPage(useMock: boolean, id = "ep-1") {
  vi.resetModules();
  mockDiAndAuth(useMock);
  const { default: EditExamPage } = await import("./page");
  return EditExamPage({ params: Promise.resolve({ id }) });
}

describe("EditExamPage — real-mode builder access gate (US-E18.28)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listExec.mockResolvedValue([]);
  });

  it("real mode + owner's own DRAFT → renders the real ExamBuilderScreen, not the blocked state", async () => {
    getDetailExec.mockResolvedValue(DRAFT_OWNED);
    getAccessToken.mockResolvedValue("token-author-1");
    decodeSubClaim.mockReturnValue("author-1");

    const el = (await renderPage(false)) as {
      type: { name?: string };
      props: Record<string, unknown>;
    };
    expect(el.type.name).toBe("ExamBuilderScreen");
    // The real-mode-only prop wiring is exercised, not just source-asserted.
    expect(el.props.reorderEnabled).toBe(false);
    expect(el.props.metaEditable).toBe(false);
    expect(el.props.requireCompleteQuestions).toBe(true);
    expect(el.props.initial).toEqual(DRAFT_OWNED);
  });

  it("real mode + published paper (even for the owner) → renders the blocked state with reason=not-draft", async () => {
    getDetailExec.mockResolvedValue({ ...DRAFT_OWNED, status: "published" });
    getAccessToken.mockResolvedValue("token-author-1");
    decodeSubClaim.mockReturnValue("author-1");

    const el = (await renderPage(false)) as {
      type: { name?: string };
      props: Record<string, unknown>;
    };
    expect(el.type.name).toBe("ExamBuilderUnavailable");
    expect(el.props.reason).toBe("not-draft");
  });

  it("real mode + another teacher's DRAFT → renders the blocked state with reason=not-author", async () => {
    getDetailExec.mockResolvedValue(DRAFT_OWNED);
    getAccessToken.mockResolvedValue("token-someone-else");
    decodeSubClaim.mockReturnValue("someone-else");

    const el = (await renderPage(false)) as {
      type: { name?: string };
      props: Record<string, unknown>;
    };
    expect(el.type.name).toBe("ExamBuilderUnavailable");
    expect(el.props.reason).toBe("not-author");
  });

  it("real mode + no decodable token claim → blocked as not-author (fail-closed, no crash)", async () => {
    getDetailExec.mockResolvedValue(DRAFT_OWNED);
    getAccessToken.mockResolvedValue(undefined);
    decodeSubClaim.mockReturnValue(null);

    const el = (await renderPage(false)) as {
      type: { name?: string };
      props: Record<string, unknown>;
    };
    expect(el.type.name).toBe("ExamBuilderUnavailable");
    expect(el.props.reason).toBe("not-author");
  });

  it("mock mode → always renders the real builder regardless of status/author (no real caller identity to gate on)", async () => {
    getDetailExec.mockResolvedValue({ ...DRAFT_OWNED, status: "published" });

    const el = (await renderPage(true)) as {
      type: { name?: string };
      props: Record<string, unknown>;
    };
    expect(el.type.name).toBe("ExamBuilderScreen");
    expect(el.props.reorderEnabled).toBe(true);
    expect(el.props.metaEditable).toBe(true);
    expect(el.props.requireCompleteQuestions).toBe(false);
  });

  it("detail load failure (e.g. non-existent id) calls notFound() rather than rendering", async () => {
    getDetailExec.mockRejectedValue(new Error("not-found"));

    await expect(renderPage(false, "missing-id")).rejects.toThrow();
  });
});
