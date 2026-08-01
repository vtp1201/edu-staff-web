import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamBankSummary } from "@/features/exam-bank/domain/entities/exam-bank-summary.entity";

/**
 * QA (US-E18.28): `resolveCurrentTeacherId` — the caller-id-from-JWT-`sub`
 * resolution that makes `isOwner`-gated edit/delete/publish reachable at all in
 * real mode — had zero route-level test. Without it, real mode would silently
 * keep comparing against the hardcoded mock teacher id and every real paper's
 * `canEdit`/`canDelete` would be permanently `false` (dead-code gating, per the
 * story's own "Engineer decisions worth reviewing" §4). `USE_MOCK` is a
 * module-eval-time const — mock the module directly + `vi.resetModules()` per
 * test (recipe from the sibling `[id]/edit/page.test.ts`).
 */

const listExec = vi.fn();
const getAccessToken = vi.fn();
const decodeSubClaim = vi.fn();

const EXAMS: ExamBankSummary[] = [
  {
    id: "ep-1",
    title: "Đề Toán",
    subjectId: "s-math",
    subjectName: "Toán",
    teacherId: "author-real-1",
    teacherName: "author-real-1",
    totalQuestions: 1,
    durationMinutes: 45,
    maxAttempts: 1,
    status: "draft",
    createdAt: "2026-07-01",
  },
];

function mockDiAndAuth(useMock: boolean) {
  vi.doMock("@/bootstrap/di/exam-bank.di", () => ({
    makeListExamBankUseCase: async () => ({ execute: listExec }),
  }));
  vi.doMock("@/bootstrap/lib/mock", () => ({ USE_MOCK: useMock }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({ getAccessToken }));
  vi.doMock("@/bootstrap/lib/jwt", () => ({ decodeSubClaim }));
  vi.doMock("./actions", () => ({
    publishExamAction: vi.fn(),
    deleteExamAction: vi.fn(),
  }));
}

async function renderPage(useMock: boolean) {
  vi.resetModules();
  mockDiAndAuth(useMock);
  const { default: TeacherExamBankPage } = await import("./page");
  return TeacherExamBankPage();
}

describe("TeacherExamBankPage — currentTeacherId resolution (US-E18.28)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listExec.mockResolvedValue(EXAMS);
  });

  it("real mode resolves currentTeacherId from the token's `sub` claim, not the mock constant", async () => {
    getAccessToken.mockResolvedValue("token-author-real-1");
    decodeSubClaim.mockReturnValue("author-real-1");

    const el = (await renderPage(false)) as { props: Record<string, unknown> };
    expect(el.props.currentTeacherId).toBe("author-real-1");
    // This is what makes the owned-paper's card gate `isOwner: true` downstream.
    expect(el.props.currentTeacherId).toBe(EXAMS[0].teacherId);
  });

  it("real mode with no token → fail-closed empty string (never equals a real authorId)", async () => {
    getAccessToken.mockResolvedValue(undefined);
    decodeSubClaim.mockReturnValue(null);

    const el = (await renderPage(false)) as { props: Record<string, unknown> };
    expect(el.props.currentTeacherId).toBe("");
    expect(el.props.currentTeacherId).not.toBe(EXAMS[0].teacherId);
  });

  it("mock mode keeps the seeded MOCK_CURRENT_TEACHER_ID regardless of token state", async () => {
    const el = (await renderPage(true)) as { props: Record<string, unknown> };
    expect(el.props.currentTeacherId).toBe("u-teacher-1");
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it("wires authoringEnabled=USE_MOCK and editingEnabled=true to the screen VM", async () => {
    getAccessToken.mockResolvedValue("t");
    decodeSubClaim.mockReturnValue("author-real-1");

    const real = (await renderPage(false)) as {
      props: Record<string, unknown>;
    };
    expect(real.props.authoringEnabled).toBe(false);
    expect(real.props.editingEnabled).toBe(true);

    const mock = (await renderPage(true)) as { props: Record<string, unknown> };
    expect(mock.props.authoringEnabled).toBe(true);
    expect(mock.props.editingEnabled).toBe(true);
  });
});
