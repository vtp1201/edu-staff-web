import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NOTI_EP } from "@/bootstrap/endpoint";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { createMockUpstream } from "@/bootstrap/realtime/mock-upstream.server";
import { resolveStreamTenant } from "./stream-tenant";

// Long-lived streaming connection — never statically rendered/cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

const NOTI_URL = process.env.NOTI_SERVICE_URL;

/**
 * SSE proxy (decision `0009`): the client connects same-origin so the httpOnly
 * `auth_token` cookie rides along; this handler reads it server-side and opens
 * the upstream `noti` stream with a Bearer token — the token never reaches the
 * client. Tenant scope comes from the `tenant` query param for now; it moves to
 * the resolved tenant segment/cookie when E05.1 lands.
 */
export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const store = await cookies();
  const requested =
    request.nextUrl.searchParams.get("tenant") ??
    store.get("tenant_id")?.value ??
    "default";

  // Validate the requested tenant against the token's tenantId claim (defense-in-depth).
  // Mock-first (ADR 0014/0024): skip in mock mode — mock tokens carry no real tenantId.
  const tenantResolution = resolveStreamTenant(token, requested, USE_MOCK);
  if (!tenantResolution.ok) {
    return new Response("Forbidden", { status: 403 });
  }
  const tenantId = tenantResolution.tenantId;

  // Mock-first (decision `0014`): no BE `noti` yet → serve a local stream.
  if (USE_MOCK || !NOTI_URL) {
    return new Response(createMockUpstream(tenantId), { headers: SSE_HEADERS });
  }

  // Proxy the real upstream, forwarding Bearer auth + resume cursor.
  const upstream = await fetch(
    `${NOTI_URL}${NOTI_EP.stream}?tenant=${encodeURIComponent(tenantId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
        ...(request.headers.get("last-event-id")
          ? { "Last-Event-ID": request.headers.get("last-event-id") as string }
          : {}),
      },
      signal: request.signal,
    },
  );

  if (!upstream.ok || !upstream.body) {
    return new Response("Bad Gateway", { status: 502 });
  }

  return new Response(upstream.body, { headers: SSE_HEADERS });
}
