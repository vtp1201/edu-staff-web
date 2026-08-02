/**
 * US-E20.5 fix round — end-to-end posture of the `/parent/attendance` RSC.
 *
 * Asserted by inspecting the `vm` prop of the returned
 * `<ParentAttendanceContainer>` element (the RSC returns a React element
 * without rendering it), with the REAL DI factory + repositories behind it —
 * so this proves the whole page → di → repository → use-case chain, not just
 * the factory.
 *
 * The point: with `NEXT_PUBLIC_USE_MOCK` unset or `"false"` (a real/production
 * environment) a parent must get ZERO attendance rows, never fabricated
 * present/late/excused/absent records for their real child.
 *
 * US-E18.33 update: the child ROSTER is no longer force-mocked either (IAM
 * ADR-0120 unblocked name resolution), so in real mode the switcher is fed by
 * the real `core` linked-students read. The real branch therefore needs the
 * server-only session/http seams stubbed — `cookies()` is unavailable outside a
 * request scope — and the assertion sharpens: neither the records NOR the
 * roster may be fabricated. The specific `error: "forbidden"` attendance signal
 * is proved (with a working roster) by `bootstrap/di/parent-attendance.di.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParentAttendanceScreenVM } from "@/features/parent-attendance/presentation/parent-attendance-screen/parent-attendance-screen.i-vm";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
  vi.doUnmock("@/bootstrap/di/auth.di");
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  vi.doUnmock("@/bootstrap/lib/jwt");
});

/**
 * Stand in for the Next request scope the real DI branch needs. `get` resolves
 * an EMPTY roster — the honest answer for a parent whose linked-students read
 * returns nothing; the assertion is that nothing invents children anyway.
 */
function stubRealSession() {
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {}),
  }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => ({
      get: vi.fn(async () => ({ links: [] })),
    })),
  }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: vi.fn(async () => "token"),
  }));
  vi.doMock("@/bootstrap/lib/jwt", () => ({
    decodeSubClaim: vi.fn(() => "parent-1"),
  }));
}

async function vmWithEnv(
  value: string | undefined,
): Promise<ParentAttendanceScreenVM> {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { default: Page } = await import("./page");
  const element = (await Page({ searchParams: Promise.resolve({}) })) as {
    props: { vm: ParentAttendanceScreenVM };
  };
  return element.props.vm;
}

describe("ParentAttendancePage", () => {
  it('shows mock records only when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    const vm = await vmWithEnv("true");
    expect(vm.error).toBeNull();
    expect(vm.records.length).toBeGreaterThan(0);
    expect(vm.activeChildId).not.toBeNull();
  });

  for (const value of [undefined, "false"] as const) {
    it(`invents neither attendance rows nor children with NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      stubRealSession();
      const vm = await vmWithEnv(value);
      // The whole point: no invented attendance for a real child…
      expect(vm.records).toEqual([]);
      // …and, since US-E18.33, no invented CHILDREN either — the real roster
      // read returned none, so the switcher shows none.
      expect(vm.childList).toEqual([]);
      expect(vm.activeChildId).toBeNull();
      // The range control still renders.
      expect(vm.range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  }

  it("shows the REAL roster (real names, no mock fixtures) when the parent has linked children", async () => {
    vi.doMock("@/bootstrap/di/auth.di", () => ({
      ensureFreshSession: vi.fn(async () => {}),
    }));
    vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
      getAccessToken: vi.fn(async () => "token"),
    }));
    vi.doMock("@/bootstrap/lib/jwt", () => ({
      decodeSubClaim: vi.fn(() => "parent-1"),
    }));
    vi.doMock("@/bootstrap/lib/http.server", () => ({
      createServerHttpClient: vi.fn(async () => ({
        get: vi.fn(async (url: string) =>
          url.includes("linked-students")
            ? {
                links: [
                  {
                    linkId: "link-a",
                    parentMemberId: "parent-1",
                    studentMemberId: "st-1",
                    createdAt: "2026-01-01T00:00:00Z",
                    classId: "cls-1",
                    className: "10A1",
                  },
                ],
              }
            : [{ memberId: "st-1", displayName: "Đỗ Gia Bảo" }],
        ),
      })),
    }));

    const vm = await vmWithEnv("false");
    expect(vm.childList).toEqual([
      {
        childId: "st-1",
        name: "Đỗ Gia Bảo",
        className: "10A1",
        ordinal: 1,
        avatar: "ĐB",
        color: "primary",
      },
    ]);
    expect(vm.activeChildId).toBe("st-1");
    // Attendance itself is still unavailable to a PARENT — roster real,
    // records honestly empty.
    expect(vm.records).toEqual([]);
    expect(vm.error).toBe("forbidden");
  });
});
