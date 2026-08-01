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

// Kong gateway (ADR `0030`/`0065`) — same base URL + override convention as
// `bootstrap/lib/http.ts`. The real branch below routes THROUGH Kong (Kong
// verifies the JWT at the edge and injects `X-Edu-Claims` for `notification`
// to trust, per edu-api ADR `0047`) instead of the retired direct-bypass
// `NOTI_SERVICE_URL` design (ADR `0009`/`0030`, superseded by ADR `0065`).
const KONG_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * SSE proxy (decision `0009`, re-architected `0065`): the client connects
 * same-origin so the httpOnly `auth_token` cookie rides along; this handler
 * reads it server-side and opens the upstream `noti` stream THROUGH Kong with
 * a Bearer token — the token never reaches the client. Tenant scope comes
 * from the `tenant` query param for now; it moves to the resolved tenant
 * segment/cookie when E05.1 lands.
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

  // Mock-first (decision `0014`): serve a local stream in mock mode.
  if (USE_MOCK) {
    return new Response(createMockUpstream(tenantId), { headers: SSE_HEADERS });
  }

  // Proxy the real upstream THROUGH Kong (ADR `0065`), forwarding Bearer auth
  // + resume cursor. Kong verifies the JWT at the edge and injects
  // `X-Edu-Claims` for `notification` to trust (edu-api ADR `0047`).
  const upstream = await fetch(
    `${KONG_URL}${NOTI_EP.stream}?tenant=${encodeURIComponent(tenantId)}`,
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
