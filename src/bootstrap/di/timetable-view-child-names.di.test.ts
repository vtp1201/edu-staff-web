/**
 * Unit tests — `makeGetChildListUseCase()` (timetable) name wiring, US-E18.33.
 *
 * `linked-students` carries no display name, so the parent picker rendered
 * "Con thứ N" for every child (ask #20 residual). IAM ADR-0120 made
 * `GET /members?ids=` callable by a PARENT; this file proves the DI factory
 * actually THREADS that resolver into the real repository — a resolver wired
 * in the repository but forgotten in DI would leave the gap open with all
 * repository tests green.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
  vi.doUnmock("@/bootstrap/di/auth.di");
  vi.doUnmock("@/bootstrap/di/iam-directory.di");
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  vi.doUnmock("@/bootstrap/lib/jwt");
});

const LINKS = {
  links: [
    {
      linkId: "link-a",
      parentMemberId: "p-1",
      studentMemberId: "st-1",
      createdAt: "2026-01-01T00:00:00Z",
      classId: "cls-1",
      className: "10A1",
    },
  ],
};

function stubRealDeps(batchExecute: ReturnType<typeof vi.fn>) {
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {}),
  }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => ({
      get: vi.fn(async () => LINKS),
    })),
  }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: vi.fn(async () => "token"),
  }));
  vi.doMock("@/bootstrap/lib/jwt", () => ({
    decodeSubClaim: vi.fn(() => "p-1"),
    decodeRoleClaim: vi.fn(() => "parent"),
  }));
  vi.doMock("@/bootstrap/di/iam-directory.di", () => ({
    makeBatchResolveMembersUseCase: vi.fn(async () => ({
      execute: batchExecute,
    })),
  }));
}

async function childrenWithRealDi() {
  process.env.NEXT_PUBLIC_USE_MOCK = "false";
  const { makeGetChildListUseCase } = await import("./timetable-view.di");
  return (await makeGetChildListUseCase()).execute();
}

describe("makeGetChildListUseCase (timetable parent picker)", () => {
  it("threads the IAM batch resolver through so the picker gets a REAL name, not the ordinal fallback", async () => {
    const execute = vi.fn(async () => ({
      ok: true as const,
      value: [{ memberId: "st-1", displayName: "Nguyễn Minh Khoa" }],
    }));
    stubRealDeps(execute);

    const result = await childrenWithRealDi();

    // Scoped to the parent's OWN linked ids — never an arbitrary id list.
    expect(execute).toHaveBeenCalledWith(["st-1"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]?.name).toBe("Nguyễn Minh Khoa");
    expect(result.data[0]?.avatar).toBe("NK");
  });

  it("leaves the ordinal fallback live when the lookup resolves nothing", async () => {
    stubRealDeps(vi.fn(async () => ({ ok: true as const, value: [] })));

    const result = await childrenWithRealDi();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]?.name).toBeUndefined();
    expect(result.data[0]?.ordinal).toBe(1);
    expect(result.data[0]?.avatar).toBe("1");
  });

  it("leaves the ordinal fallback live when the lookup FAILS — a name gap never fails the roster", async () => {
    stubRealDeps(
      vi.fn(async () => ({
        ok: false as const,
        failure: { type: "forbidden" },
      })),
    );

    const result = await childrenWithRealDi();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]?.name).toBeUndefined();
    expect(result.data[0]?.className).toBe("10A1");
  });
});
