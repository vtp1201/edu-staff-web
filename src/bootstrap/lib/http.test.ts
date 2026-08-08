import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { createHttpClient } from "./http";

/**
 * Drives a request through the REAL interceptor chain without any network call:
 * a stub adapter captures the outgoing config and answers with a success
 * envelope so the response interceptor stays on its normal path.
 */
async function captureRequest(
  client: ReturnType<typeof createHttpClient>,
  requestHeaders?: Record<string, string>,
): Promise<InternalAxiosRequestConfig> {
  let captured: InternalAxiosRequestConfig | undefined;

  client.defaults.adapter = async (config) => {
    captured = config;
    return {
      data: { success: true, data: { ok: true }, error: null, meta: {} },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    } as unknown as AxiosResponse;
  };

  await client.get("/probe", requestHeaders ? { headers: requestHeaders } : {});

  if (!captured) throw new Error("adapter was never invoked");
  return captured;
}

/** Dot access — mirrors how most call-sites read the header. Case-SENSITIVE. */
async function outgoingAuthHeader(
  client: ReturnType<typeof createHttpClient>,
  requestHeaders?: Record<string, string>,
): Promise<string | undefined> {
  const value = (await captureRequest(client, requestHeaders)).headers
    ?.Authorization;
  return typeof value === "string" ? value : undefined;
}

describe("createHttpClient — Authorization header precedence", () => {
  it("lets an explicit per-request Authorization win over the client default", async () => {
    const header = await outgoingAuthHeader(createHttpClient("A"), {
      Authorization: "Bearer B",
    });
    expect(header).toBe("Bearer B");
  });

  it("honors a lowercase per-request `authorization` header and emits it only once", async () => {
    // Dot access is case-SENSITIVE on AxiosHeaders, so the guard must use the
    // case-insensitive `.has()`; otherwise the default token is appended as a
    // second, differently-cased key and precedence silently breaks.
    const config = await captureRequest(createHttpClient("A"), {
      authorization: "Bearer B",
    });

    expect(config.headers?.get?.("Authorization")).toBe("Bearer B");
    const authKeys = Object.keys(config.headers ?? {}).filter(
      (k) => k.toLowerCase() === "authorization",
    );
    expect(authKeys).toHaveLength(1);
  });

  it("falls back to the client default token when the request sets no header", async () => {
    const header = await outgoingAuthHeader(createHttpClient("A"));
    expect(header).toBe("Bearer A");
  });

  it("sends no Authorization header when there is no token and no per-request header", async () => {
    const header = await outgoingAuthHeader(createHttpClient());
    expect(header).toBeUndefined();
  });
});
