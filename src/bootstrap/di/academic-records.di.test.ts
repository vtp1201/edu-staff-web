/**
 * US-E18.54 — `makeRepository()` in `academic-records.di.ts` (the read-only
 * VIEWER factory) is on the STANDARD `USE_MOCK ? Mock : Real` gate again. It
 * was PERMANENTLY force-mocked from US-E18.21 (ADR 0055 §Context #6, a
 * domain-model gap) until BE's 2026-08-07 answer pointed at the already-shipped
 * `GET /members/{memberId}/academic-records`. This file is the env-matrix proof
 * of the flip AND the regression guard for the seal factory, which US-E18.54
 * did not touch:
 *
 * - viewer factory: mock when `USE_MOCK=true`, REAL otherwise (including the
 *   `undefined` default);
 * - seal factory (`makeSealRepository()`): unchanged hybrid behaviour — the
 *   whole point of keeping the two factories separate in one file.
 *
 * Repositories are identified by `constructor.name` rather than `instanceof`:
 * `vi.resetModules()` gives each import a fresh class identity per module
 * graph, so `instanceof` against a separately-imported class is unreliable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  vi.doUnmock("@/bootstrap/lib/jwt");
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

function setEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
}

/** Every use-case stores its collaborator repository as its sole object field. */
function repoNameOf(useCase: unknown): string {
  const values = Object.values(useCase as Record<string, unknown>).filter(
    (v): v is object => typeof v === "object" && v !== null,
  );
  expect(values).toHaveLength(1);
  return values[0].constructor.name;
}

/** Stubs the server-side auth/http seams so a real branch can be constructed. */
function stubRealSeams(get: ReturnType<typeof vi.fn> = vi.fn()) {
  const createServerHttpClient = vi.fn(async () => ({ get }));
  const ensureFreshSession = vi.fn(async () => {});
  vi.doMock("@/bootstrap/lib/http.server", () => ({ createServerHttpClient }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({ ensureFreshSession }));
  return { createServerHttpClient, ensureFreshSession, get };
}

describe("academic-records.di — viewer factory is on the standard USE_MOCK gate (US-E18.54)", () => {
  it("resolves MockAcademicRecordsRepository when NEXT_PUBLIC_USE_MOCK=true", async () => {
    setEnv("true");
    const di = await import("./academic-records.di");

    expect(repoNameOf(await di.makeGetAcademicRecordUseCase())).toBe(
      "MockAcademicRecordsRepository",
    );
  });

  for (const value of [undefined, "false"] as const) {
    it(`resolves the REAL AcademicRecordsRepository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const { ensureFreshSession, createServerHttpClient } = stubRealSeams();
      setEnv(value);
      const di = await import("./academic-records.di");

      expect(repoNameOf(await di.makeGetAcademicRecordUseCase())).toBe(
        "AcademicRecordsRepository",
      );
      expect(ensureFreshSession).toHaveBeenCalled();
      expect(createServerHttpClient).toHaveBeenCalled();
    });
  }

  it("never creates a server http client for the viewer factory in mock mode", async () => {
    const { createServerHttpClient } = stubRealSeams();
    setEnv("true");
    const di = await import("./academic-records.di");

    await di.makeGetAcademicRecordUseCase();

    expect(createServerHttpClient).not.toHaveBeenCalled();
  });
});

describe("academic-records.di — the composed year join is deduped and bounded", () => {
  it("issues ONE enrollment read per DISTINCT classId, and never fails the record read when a class 403s", async () => {
    const calls: string[] = [];
    const get = vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("/academic-records")) {
        const rec = (classId: string, termId: string) => ({
          classId,
          termId,
          studentMemberId: "stu-1",
          status: "SEALED",
          gradeSnapshot: [],
          termAverage: "8.00",
          resealCount: 0,
        });
        return {
          studentMemberId: "stu-1",
          records: [
            rec("c-9", "HK1"),
            rec("c-9", "HK2"),
            rec("c-10", "HK1"),
            rec("c-10", "HK2"),
          ],
        };
      }
      if (url.includes("/subjects")) return [];
      if (url.includes("c-10")) throw new Error("403 forbidden");
      return {
        enrollmentId: "e-1",
        classId: "c-9",
        studentMemberId: "stu-1",
        academicYearLabel: "2024-2025",
        enrolledAt: "2024-09-01T00:00:00Z",
      };
    });
    stubRealSeams(get);
    setEnv("false");
    const di = await import("./academic-records.di");

    const result = await (await di.makeGetAcademicRecordUseCase()).execute(
      "stu-1",
    );

    const enrollmentCalls = calls.filter((u) =>
      /\/classes\/[^/]+\/students\//.test(u),
    );
    // 4 records, 2 distinct classes → 2 enrollment reads, not 4.
    expect(enrollmentCalls).toHaveLength(2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The resolvable class groups by year; the forbidden one degrades honestly.
    expect(result.data.years.map((y) => y.yearLabel)).toEqual([
      "2024-2025",
      null,
    ]);
  });
});

describe("academic-records.di — seal factory stays hybrid (regression guard, untouched by US-E18.54)", () => {
  it("seal use-cases resolve the mock seal repo when USE_MOCK=true", async () => {
    setEnv("true");
    const di = await import("./academic-records.di");

    expect(repoNameOf(await di.makeSealAcademicRecordUseCase())).toBe(
      "MockAcademicRecordsSealRepository",
    );
  });

  it("seal use-cases still resolve the REAL hybrid facade when USE_MOCK=false", async () => {
    const { createServerHttpClient, ensureFreshSession } = stubRealSeams();
    setEnv("false");
    const di = await import("./academic-records.di");

    expect(repoNameOf(await di.makeSealAcademicRecordUseCase())).toBe(
      "HybridAcademicRecordsSealRepository",
    );
    expect(ensureFreshSession).toHaveBeenCalled();
    expect(createServerHttpClient).toHaveBeenCalled();
  });
});
