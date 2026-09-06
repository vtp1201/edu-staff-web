/**
 * US-E24.6 — end-to-end posture of the `/student/attendance` RSC.
 *
 * Asserted by inspecting the `vm` prop of the returned
 * `<StudentAttendanceContainer>` element (the RSC returns a React element
 * without rendering it), with the REAL DI factories + repositories behind it —
 * so this proves the whole page → di → repository → use-case chain, not just a
 * factory.
 *
 * The security point (AC): a token that carries `sub` but NO `memberId` claim
 * must produce the `forbidden` state having made ZERO wire calls. `sub` is not
 * a fallback — only the `memberId` claim proves the token is tenant-scoped
 * (decision `0074`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentAttendanceScreenVM } from "@/features/attendance/presentation/student-attendance-screen/student-attendance-screen.i-vm";

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
});

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeJwt(payload: Record<string, unknown>): string {
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`;
}

/**
 * Stand in for the Next request scope the real DI branch needs, capturing every
 * HTTP call so "no wire call" is provable rather than assumed.
 */
function stubRealSession(opts: {
  token: string | null;
  get?: (url: string) => Promise<unknown>;
}) {
  const calls: string[] = [];
  const get = vi.fn(async (url: string) => {
    calls.push(url);
    return opts.get ? await opts.get(url) : { memberId: "x", records: [] };
  });
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {}),
  }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => ({ get, post: vi.fn() })),
  }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: vi.fn(async () => opts.token),
  }));
  return { calls, get };
}

async function vmWithEnv(
  value: string | undefined,
): Promise<StudentAttendanceScreenVM> {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { default: Page } = await import("./page");
  const element = (await Page()) as {
    props: { vm: StudentAttendanceScreenVM };
  };
  return element.props.vm;
}

describe("StudentAttendancePage — identity gate (decision 0074)", () => {
  it("a token with `sub` but NO `memberId` claim yields `forbidden` and calls NOTHING", async () => {
    const { calls } = stubRealSession({
      token: makeJwt({ sub: "user-1", role: "STUDENT", tenantId: "t-1" }),
    });

    const vm = await vmWithEnv("false");

    expect(vm.status).toBe("forbidden");
    // The whole point: no attendance read, no leave read, no calendar read.
    expect(calls).toEqual([]);
  });

  it("an empty `memberId` claim is treated as absent, not as a member id", async () => {
    const { calls } = stubRealSession({
      token: makeJwt({ sub: "user-1", memberId: "" }),
    });

    const vm = await vmWithEnv("false");

    expect(vm.status).toBe("forbidden");
    expect(calls).toEqual([]);
  });

  it("no token at all yields `forbidden` and calls nothing", async () => {
    const { calls } = stubRealSession({ token: null });

    const vm = await vmWithEnv("false");

    expect(vm.status).toBe("forbidden");
    expect(calls).toEqual([]);
  });
});

describe("StudentAttendancePage — real reads", () => {
  it("reads the caller's OWN memberId path and maps the records into a summary", async () => {
    const { calls } = stubRealSession({
      token: makeJwt({ sub: "user-1", memberId: "stu-9", tenantId: "t-1" }),
      get: async (url) => {
        if (url.includes("academic-years")) throw new Error("403");
        if (url.includes("student-leave-requests")) {
          return {
            success: true,
            data: [],
            error: null,
            meta: { requestId: "r", timestamp: "t" },
          };
        }
        return {
          memberId: "stu-9",
          records: [
            { date: "2026-08-03", classId: "cls-1", status: "PRESENT" },
            { date: "2026-08-04", classId: "cls-1", status: "ABSENT" },
          ],
        };
      },
    });

    const vm = await vmWithEnv("false");

    expect(vm.status).toBe("ready");
    if (vm.status !== "ready") return;
    expect(vm.summary).toMatchObject({
      total: 2,
      presentCount: 1,
      unexcusedCount: 1,
      rate: 50,
    });
    expect(vm.history).toHaveLength(1);
    expect(vm.history[0].date).toBe("2026-08-04");
    // The attendance read addresses the CLAIM's member id, never `sub`.
    expect(calls.some((url) => url.includes("/members/stu-9/attendance"))).toBe(
      true,
    );
    expect(calls.some((url) => url.includes("user-1"))).toBe(false);
  });

  /**
   * The leave-request read only ANNOTATES the history. Losing it must cost the
   * reasons, never the whole screen (`Promise.allSettled`, not `all`).
   */
  it("still renders the summary when the leave-request read fails", async () => {
    stubRealSession({
      token: makeJwt({ memberId: "stu-9" }),
      get: async (url) => {
        if (url.includes("student-leave-requests")) throw new Error("boom");
        if (url.includes("academic-years")) throw new Error("403");
        return {
          memberId: "stu-9",
          records: [{ date: "2026-08-03", classId: "c", status: "PRESENT" }],
        };
      },
    });

    const vm = await vmWithEnv("false");

    expect(vm.status).toBe("ready");
    if (vm.status !== "ready") return;
    expect(vm.summary.total).toBe(1);
  });

  it("surfaces the BE's own 403 as an ERROR state, not as the identity `forbidden`", async () => {
    stubRealSession({
      token: makeJwt({ memberId: "stu-9" }),
      get: async (url) => {
        if (url.includes("/attendance")) {
          // A RAW axios-shaped 403, so the repository's real code→failure map
          // is exercised. Deliberately not `new ApiError(...)`: `vi.resetModules()`
          // gives the page a DIFFERENT class object than this file imported, so
          // the `instanceof` branch of `errorCodeOf` would miss — the raw shape
          // goes down the same path a real un-normalised axios error would.
          throw {
            response: {
              status: 403,
              data: {
                success: false,
                data: null,
                error: {
                  code: "ATTENDANCE_FORBIDDEN",
                  message: "forbidden",
                  retryable: false,
                },
              },
            },
          };
        }
        throw new Error("403");
      },
    });

    const vm = await vmWithEnv("false");

    expect(vm.status).toBe("error");
    if (vm.status !== "error") return;
    expect(vm.errorKey).toBe("forbidden");
    // An error state still tells the reader WHICH range produced it.
    expect(vm.range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("StudentAttendancePage — mock mode", () => {
  it('renders real-looking data only when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    const vm = await vmWithEnv("true");

    expect(vm.status).toBe("ready");
    if (vm.status !== "ready") return;
    expect(vm.summary.total).toBeGreaterThan(0);
    expect(vm.months.length).toBeGreaterThan(0);
  });
});
