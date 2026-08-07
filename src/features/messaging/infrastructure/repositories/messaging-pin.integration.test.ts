/**
 * Integration tests — US-E18.51 message pin / unpin / pin board through the
 * REAL http boundary helpers (`unwrapResponse` + `normalizeError`), not a
 * hand-shaped payload.
 *
 * Why this file exists on top of the unit suite: `messaging.repository.test.ts`
 * stubs `http.get` to resolve the already-unwrapped array, so it cannot catch
 * (a) the pin board being read with `{ raw: true }` (it must NOT be — the board
 * is enveloped but not paginated, so the interceptor unwraps `data` for us), or
 * (b) an error mapping that reads the axios error shape instead of the
 * normalised `ApiError.code`.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { MESSAGING_EP } from "@/bootstrap/endpoint/messaging.endpoint";
import { normalizeError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import { MessagingRepository } from "./messaging.repository";

const SELF = "user-self";

function envelope<T>(data: T) {
  return {
    success: true,
    data,
    error: null,
    meta: { requestId: "req-1", timestamp: "2026-08-02T04:00:00.000Z" },
  };
}

function errorEnvelope(code: string, status: number, retryable = false) {
  return normalizeError({
    response: {
      status,
      data: {
        success: false,
        data: null,
        error: { code, message: code, retryable },
        meta: { requestId: "req-1", timestamp: "2026-08-02T04:00:00.000Z" },
      },
      headers: {},
    },
  });
}

/** An http double whose success path runs the REAL response interceptor. */
function interceptedHttp(bodyFor: (url: string) => unknown): {
  http: AxiosInstance;
  calls: string[];
} & {
  configs: (unknown | undefined)[];
} {
  const calls: string[] = [];
  const configs: (unknown | undefined)[] = [];
  const handler = async (url: string, config?: unknown) => {
    calls.push(url);
    configs.push(config);
    return unwrapResponse({
      data: bodyFor(url),
      config: { url, raw: (config as { raw?: boolean } | undefined)?.raw },
    });
  };
  return {
    http: {
      get: vi.fn(handler),
      post: vi.fn(handler),
      delete: vi.fn(handler),
      patch: vi.fn(handler),
    } as unknown as AxiosInstance,
    calls,
    configs,
  };
}

const pinRow = {
  messageId: "m-1",
  pinnedBy: "u-mod",
  pinnedAt: "2026-08-02T04:00:00.000Z",
  message: {
    messageId: "m-1",
    roomId: "room-1",
    senderUserId: "u-1",
    // The pin board always stamps this empty (senderName is not persisted).
    senderName: "",
    text: "Lịch thi cuối kỳ",
    status: "active",
    editCount: 0,
    createdAt: "2026-08-01T03:15:00.000Z",
  },
};

describe("MessagingRepository pin slice — real interceptor pipeline", () => {
  it("reads the pin board through the real unwrap WITHOUT raw:true", async () => {
    const { http, calls, configs } = interceptedHttp(() => envelope([pinRow]));
    const repo = new MessagingRepository(http, SELF);

    const res = await repo.getPinnedMessages("room-1");

    expect(calls).toEqual([MESSAGING_EP.roomPinnedMessages("room-1")]);
    // No config at all — a `raw: true` here would hand the repo the envelope
    // and the mapper would silently produce an empty board.
    expect(configs[0]).toBeUndefined();
    expect(res).toEqual({
      ok: true,
      value: [
        {
          messageId: "m-1",
          senderId: "u-1",
          excerpt: "Lịch thi cuối kỳ",
          sentAt: "2026-08-01T03:15:00.000Z",
          pinnedAt: "2026-08-02T04:00:00.000Z",
          pinnedBy: "u-mod",
        },
      ],
    });
  });

  it("never invents a sender name from the wire's empty senderName", async () => {
    const { http } = interceptedHttp(() => envelope([pinRow]));
    const repo = new MessagingRepository(http, SELF);

    const res = await repo.getPinnedMessages("room-1");
    if (!res.ok) throw new Error("expected ok");
    expect(res.value[0]).not.toHaveProperty("senderName");
  });

  it("posts the pin with no body and survives the 201 unwrap", async () => {
    const { http, calls } = interceptedHttp(() =>
      envelope({
        messageId: "m-1",
        pinnedBy: SELF,
        pinnedAt: "2026-08-02T04:00:00.000Z",
      }),
    );
    const repo = new MessagingRepository(http, SELF);

    expect(await repo.pinMessage("room-1", "m-1")).toEqual({
      ok: true,
      value: true,
    });
    expect(calls).toEqual([MESSAGING_EP.roomMessagePin("room-1", "m-1")]);
  });

  it("maps a normalised 409 cap error envelope to pin-limit-reached", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(errorEnvelope("SOCIAL_PIN_LIMIT_REACHED", 409));
    const repo = new MessagingRepository(
      { post } as unknown as AxiosInstance,
      SELF,
    );

    expect(await repo.pinMessage("room-1", "m-1")).toEqual({
      ok: false,
      failure: { type: "pin-limit-reached" },
    });
  });

  it("maps a normalised 429 read-quota envelope to load-pinned-failed (retryable code preserved)", async () => {
    const err = errorEnvelope("SOCIAL_READ_RATE_LIMITED", 429, true);
    const get = vi.fn().mockRejectedValue(err);
    const repo = new MessagingRepository(
      { get } as unknown as AxiosInstance,
      SELF,
    );

    expect(err.retryable).toBe(true);
    expect(await repo.getPinnedMessages("room-1")).toEqual({
      ok: false,
      failure: {
        type: "load-pinned-failed",
        cause: "SOCIAL_READ_RATE_LIMITED",
      },
    });
  });

  it("maps a normalised 404 not-pinned envelope on unpin", async () => {
    const del = vi
      .fn()
      .mockRejectedValue(errorEnvelope("SOCIAL_MESSAGE_NOT_PINNED", 404));
    const repo = new MessagingRepository(
      { delete: del } as unknown as AxiosInstance,
      SELF,
    );

    expect(await repo.unpinMessage("room-1", "m-1")).toEqual({
      ok: false,
      failure: { type: "message-not-pinned" },
    });
  });
});
