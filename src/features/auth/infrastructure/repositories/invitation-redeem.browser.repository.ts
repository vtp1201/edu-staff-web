/**
 * PUBLIC invitation lookup/redeem, issued DIRECTLY FROM THE BROWSER
 * (US-E18.59, ADR 0072 amending ADR 0071).
 *
 * ── NO `import "server-only"` HERE, ON PURPOSE ────────────────────────────
 * Every other repository in `infrastructure/` carries the `server-only` guard.
 * This one deliberately does not: both endpoints are per-IP rate limited
 * (10/min) at IAM, and while they were called from THIS Next server, Kong saw
 * one single egress IP for every visitor, so one abusive invitee could 429-lock
 * every other invitee out of account creation. Calling from the browser makes
 * the limit do what it is meant to do. A grep for "infrastructure without
 * server-only" should land here and find an intentional, ADR-recorded
 * exception, NOT an oversight. Do not copy this pattern to another route
 * without its own ADR (ADR 0072 §Consequences).
 *
 * Safe specifically here because both endpoints are unauthenticated: no bearer
 * token, no httpOnly cookie, nothing secret in the client bundle.
 *
 * TOKEN HANDLING is unchanged from the axios version: the invitation token
 * travels in the POST BODY for both calls, never as a query parameter and
 * never as a header. The emailed FRONTEND link legitimately carries `?token=`;
 * that is the page URL, not an API call.
 */
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import { OAUTH_CLIENT_ID } from "@/bootstrap/endpoint/tenant.endpoint";
import {
  type ApiEnvelope,
  ApiError,
  NETWORK_ERROR_CODE,
} from "@/bootstrap/lib/api-envelope";
import { API_URL } from "@/bootstrap/lib/http";
import type { InvitationPreview } from "../../domain/entities/invitation-preview.entity";
import type { RedeemedInvitation } from "../../domain/entities/redeemed-invitation.entity";
import type {
  IInvitationRedeemRepository,
  RedeemInvitationCommand,
} from "../../domain/repositories/i-invitation-redeem.repository";
import type {
  LookupInvitationResponseDto,
  RedeemInvitationResponseDto,
} from "../dtos/invitation-redeem-response.dto";
import {
  mapInvitationPreview,
  mapInvitationRedeemFailure,
  mapRedeemedInvitation,
} from "../mappers/invitation-redeem.mapper";

/**
 * `Retry-After`, delta-seconds form only — the same rule
 * `api-envelope.ts#parseRetryAfter` applies to axios headers, restated for the
 * `Headers` object `fetch` returns (that helper is module-private and takes a
 * plain bag, not `Headers`). An HTTP-date is deliberately ignored rather than
 * guessed at, and only a strictly positive delta is a wait instruction.
 */
function retryAfterFrom(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (raw === null) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

function asEnvelope(body: unknown): ApiEnvelope<unknown> | undefined {
  return typeof body === "object" && body !== null && "success" in body
    ? (body as ApiEnvelope<unknown>)
    : undefined;
}

/**
 * Failed `fetch` response → the SAME normalised {@link ApiError} contract
 * axios' `normalizeError` produces. This is the whole reason
 * `mapInvitationRedeemFailure` needs no change: it reads `code`/`status`/
 * `retryAfterSeconds`/`fields` off the class, not off an axios shape.
 */
export function apiErrorFromResponse(
  status: number,
  body: unknown,
  headers: Headers,
): ApiError {
  const error = asEnvelope(body)?.error;
  return new ApiError({
    code: error?.code ?? "UNKNOWN_ERROR",
    message: error?.message ?? "Request failed",
    retryable: error?.retryable ?? false,
    fields: error?.fields,
    requestId: asEnvelope(body)?.meta?.requestId,
    status,
    retryAfterSeconds: retryAfterFrom(headers),
  });
}

async function postJson<T>(
  path: string,
  body: Record<string, string>,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      // Explicit even though cross-origin `fetch` already omits cookies: a
      // same-origin dev proxy would otherwise attach whatever session happens
      // to be on the device to an account-creation call.
      credentials: "omit",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError({
      code: NETWORK_ERROR_CODE,
      message:
        cause instanceof Error ? cause.message : "Network request failed",
      retryable: true,
      status: 0,
    });
  }

  // A gateway can answer with HTML (502) rather than an envelope; an
  // unparseable body must degrade to a generic failure, never a parse crash.
  const parsed: unknown = await response.json().catch(() => undefined);
  const envelope = asEnvelope(parsed);

  if (!response.ok || envelope?.success !== true) {
    throw apiErrorFromResponse(response.status, parsed, response.headers);
  }
  return envelope.data as T;
}

export class BrowserInvitationRedeemRepository
  implements IInvitationRedeemRepository
{
  async lookup(token: string): Promise<InvitationPreview> {
    try {
      // Body is EXACTLY { token } — the client volunteers no email/tenant hint.
      const dto = await postJson<LookupInvitationResponseDto>(
        IAM_MEMBER_EP.lookupInvitation,
        { token },
      );
      return mapInvitationPreview(dto);
    } catch (err) {
      throw mapInvitationRedeemFailure(err);
    }
  }

  async redeem(command: RedeemInvitationCommand): Promise<RedeemedInvitation> {
    try {
      const dto = await postJson<RedeemInvitationResponseDto>(
        IAM_MEMBER_EP.redeemInvitation,
        // Fields listed explicitly (not `...command`) so no future field on the
        // command object can silently reach the wire. NO `email`: the account's
        // address is the invitation's, resolved server-side (ADR 0131 D5).
        {
          token: command.token,
          password: command.password,
          fullName: command.fullName,
        },
        // Audit metadata recorded on the issued session. A HEADER because the
        // body shape is fixed by ADR 0131 D5; it is a fixed client id and never
        // carries the invitation token.
        { "X-Client-Id": OAUTH_CLIENT_ID },
      );
      return mapRedeemedInvitation(dto);
    } catch (err) {
      throw mapInvitationRedeemFailure(err);
    }
  }
}
