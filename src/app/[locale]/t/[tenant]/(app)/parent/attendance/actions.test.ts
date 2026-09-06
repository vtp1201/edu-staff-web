/**
 * US-E24.6 — `submitLeaveRequestAction` / `retryLeaveAttachmentsAction`.
 *
 * Exercised against the REAL DI factory + repository with only the server-only
 * seams (session, http client, token) stubbed, so these prove the whole
 * action → di → repository → wire chain: the POST body core actually receives,
 * the per-file attachment calls, and the failure keys.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_USE_MOCK = "false";
  // The action has no injectable clock ON PURPOSE (a Server Action's arguments
  // are all client-supplied, so a `today` parameter would be a back-dating
  // hole). Freeze the system clock instead.
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T03:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
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

const CREATED = {
  requestId: "req-9",
  studentMemberId: "child-1",
  classId: "cls-1",
  startDate: "2026-09-10",
  endDate: "2026-09-12",
  reason: "Khám sức khoẻ",
  state: "SUBMITTED" as const,
  submittedByMemberId: "parent-1",
  createdAt: "2026-09-06T08:00:00Z",
  updatedAt: "2026-09-06T08:00:00Z",
};

const ATTACHMENT = {
  attachmentId: "att-1",
  fileName: "don.pdf",
  contentType: "application/pdf",
  sizeBytes: 12,
  url: "https://signed.example/att-1",
  expiresAt: "2026-09-06T08:15:00Z",
  uploadedAt: "2026-09-06T08:00:00Z",
  unavailable: false,
};

type PostCall = { url: string; body: unknown; config?: unknown };

function stubServer(opts: {
  token?: string;
  post?: (call: PostCall, index: number) => Promise<unknown>;
}) {
  const calls: PostCall[] = [];
  const post = vi.fn(async (url: string, body: unknown, config?: unknown) => {
    const call = { url, body, config };
    calls.push(call);
    if (opts.post) return await opts.post(call, calls.length - 1);
    return url.includes("/attachments") ? ATTACHMENT : CREATED;
  });
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {}),
  }));
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => ({ get: vi.fn(), post })),
  }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({
    getAccessToken: vi.fn(
      async () =>
        opts.token ??
        makeJwt({ memberId: "parent-1", role: "PARENT", tenantId: "t-1" }),
    ),
  }));
  return { calls, post };
}

const INPUT = {
  studentMemberId: "child-1",
  classId: "cls-1",
  startDate: "2026-09-10",
  endDate: "2026-09-12",
  reason: "Khám sức khoẻ",
};

function formDataWith(names: string[]): FormData {
  const fd = new FormData();
  for (const name of names) {
    fd.append("file", new File([new Uint8Array(12)], name));
  }
  return fd;
}

async function actions() {
  return import("./actions");
}

describe("submitLeaveRequestAction — the POST body", () => {
  it("sends EXACTLY core's five fields (no `type`, no `submittedBy`)", async () => {
    const { calls } = stubServer({});
    const { submitLeaveRequestAction } = await actions();

    const result = await submitLeaveRequestAction(INPUT, new FormData());

    expect(result).toEqual({
      ok: true,
      requestId: "req-9",
      total: 0,
      failedCount: 0,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/core/api/v1/conduct/student-leave-requests");
    expect(Object.keys(calls[0].body as object).sort()).toEqual([
      "classId",
      "endDate",
      "reason",
      "startDate",
      "studentMemberId",
    ]);
    expect(calls[0].body).toEqual(INPUT);
  });

  it("refuses an invalid draft BEFORE any HTTP (empty reason)", async () => {
    const { calls } = stubServer({});
    const { submitLeaveRequestAction } = await actions();

    const result = await submitLeaveRequestAction(
      { ...INPUT, reason: "   " },
      new FormData(),
    );

    expect(result).toEqual({ ok: false, errorKey: "reason-too-short" });
    expect(calls).toEqual([]);
  });

  it("maps core's 403 to `forbidden` and uploads nothing", async () => {
    const { calls } = stubServer({
      post: async () => {
        throw {
          response: {
            status: 403,
            data: {
              error: { code: "LEAVE_REQUEST_FORBIDDEN", retryable: false },
            },
          },
        };
      },
    });
    const { submitLeaveRequestAction } = await actions();

    const result = await submitLeaveRequestAction(
      INPUT,
      formDataWith(["a.pdf"]),
    );

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    // No attachment was attempted against a request that was never created.
    expect(calls).toHaveLength(1);
  });
});

describe("submitLeaveRequestAction — attachments", () => {
  it("uploads each file SEQUENTIALLY against the new requestId + studentMemberId", async () => {
    const { calls } = stubServer({});
    const { submitLeaveRequestAction } = await actions();

    const result = await submitLeaveRequestAction(
      INPUT,
      formDataWith(["a.pdf", "b.png"]),
    );

    expect(result).toEqual({
      ok: true,
      requestId: "req-9",
      total: 2,
      failedCount: 0,
    });
    // create, then one call per file, in order.
    expect(calls.map((c) => c.url)).toEqual([
      "/core/api/v1/conduct/student-leave-requests",
      "/core/api/v1/conduct/student-leave-requests/req-9/attachments",
      "/core/api/v1/conduct/student-leave-requests/req-9/attachments",
    ]);
    for (const call of calls.slice(1)) {
      expect((call.config as { params: unknown }).params).toEqual({
        studentMemberId: "child-1",
      });
      expect(call.body).toBeInstanceOf(FormData);
    }
    expect(((calls[1].body as FormData).get("file") as File).name).toBe(
      "a.pdf",
    );
    expect(((calls[2].body as FormData).get("file") as File).name).toBe(
      "b.png",
    );
  });

  /**
   * AC: a failed FILE must not lose the REQUEST. The action reports N/M and the
   * screen offers a files-only retry — it never creates a second request.
   */
  it("keeps the created request and reports N/M when some files fail", async () => {
    stubServer({
      post: async (call, index) => {
        if (!call.url.includes("/attachments")) return CREATED;
        if (index === 2) throw new Error("storage down");
        return ATTACHMENT;
      },
    });
    const { submitLeaveRequestAction } = await actions();

    const result = await submitLeaveRequestAction(
      INPUT,
      formDataWith(["a.pdf", "b.png", "c.png"]),
    );

    expect(result).toEqual({
      ok: true,
      requestId: "req-9",
      total: 3,
      failedCount: 1,
    });
  });

  it("keeps uploading the remaining files after one fails", async () => {
    const { calls } = stubServer({
      post: async (call, index) => {
        if (!call.url.includes("/attachments")) return CREATED;
        if (index === 1) throw new Error("boom");
        return ATTACHMENT;
      },
    });
    const { submitLeaveRequestAction } = await actions();

    const result = await submitLeaveRequestAction(
      INPUT,
      formDataWith(["a.pdf", "b.png"]),
    );

    expect(result).toMatchObject({ ok: true, total: 2, failedCount: 1 });
    expect(calls).toHaveLength(3);
  });
});

describe("retryLeaveAttachmentsAction", () => {
  it("re-uploads to the SAME request — it never creates a second one", async () => {
    const { calls } = stubServer({});
    const { retryLeaveAttachmentsAction } = await actions();

    const result = await retryLeaveAttachmentsAction(
      "req-9",
      "child-1",
      formDataWith(["a.pdf"]),
    );

    expect(result).toEqual({ ok: true, total: 1, failedCount: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "/core/api/v1/conduct/student-leave-requests/req-9/attachments",
    );
  });

  it("reports how many files still failed", async () => {
    stubServer({
      post: async () => {
        throw {
          response: {
            status: 409,
            data: {
              error: {
                code: "LEAVE_REQUEST_ATTACHMENT_LOCKED",
                retryable: false,
              },
            },
          },
        };
      },
    });
    const { retryLeaveAttachmentsAction } = await actions();

    expect(
      await retryLeaveAttachmentsAction(
        "req-9",
        "child-1",
        formDataWith(["a.pdf", "b.pdf"]),
      ),
    ).toEqual({ ok: true, total: 2, failedCount: 2 });
  });
});

describe("submitLeaveRequestAction — whose request is this? (security)", () => {
  /**
   * A STUDENT may only ever submit for THEMSELVES. The action overrides any
   * client-supplied `studentMemberId` with the token's own `memberId` claim, so
   * a hand-made payload cannot file a request against a classmate — the check
   * runs BEFORE the wire, in addition to core's own authorization.
   */
  it("a STUDENT caller cannot address anyone but themselves", async () => {
    const { calls } = stubServer({
      token: makeJwt({ memberId: "stu-me", role: "STUDENT", tenantId: "t-1" }),
    });
    const { submitLeaveRequestAction } = await actions();

    await submitLeaveRequestAction(
      { ...INPUT, studentMemberId: "someone-else" },
      new FormData(),
    );

    expect((calls[0].body as { studentMemberId: string }).studentMemberId).toBe(
      "stu-me",
    );
  });

  it("a STUDENT caller with no memberId claim is refused before the wire", async () => {
    const { calls } = stubServer({
      token: makeJwt({ sub: "u-1", role: "STUDENT" }),
    });
    const { submitLeaveRequestAction } = await actions();

    const result = await submitLeaveRequestAction(INPUT, new FormData());

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(calls).toEqual([]);
  });

  /** A PARENT legitimately names the linked child; core authorises the link. */
  it("a PARENT caller's child id is passed through untouched", async () => {
    const { calls } = stubServer({});
    const { submitLeaveRequestAction } = await actions();

    await submitLeaveRequestAction(INPUT, new FormData());

    expect((calls[0].body as { studentMemberId: string }).studentMemberId).toBe(
      "child-1",
    );
  });
});
