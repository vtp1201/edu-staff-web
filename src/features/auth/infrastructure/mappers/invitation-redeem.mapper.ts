import {
  errorCodeOf,
  retryAfterSecondsOf,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { InvitationPreview } from "../../domain/entities/invitation-preview.entity";
import type { RedeemedInvitation } from "../../domain/entities/redeemed-invitation.entity";
import type {
  InvitationFieldIssue,
  InvitationRedeemFailure,
} from "../../domain/failures/invitation-redeem.failure";
import type {
  LookupInvitationResponseDto,
  RedeemInvitationResponseDto,
} from "../dtos/invitation-redeem-response.dto";
import { mapTokens } from "./auth.mapper";
import { mapMemberResponse } from "./iam-member.mapper";

/** `LookupInvitationResponse` → {@link InvitationPreview}. */
export function mapInvitationPreview(
  dto: LookupInvitationResponseDto,
): InvitationPreview {
  return {
    email: dto.email,
    tenantName: dto.tenantName,
    // Go marshals a nil slice as `null`, and the roles line is iterated by the
    // preview copy — normalise to [] so a role-less invitation renders the
    // "no role" fallback instead of throwing.
    roles: dto.roles ?? [],
    expiresAt: dto.expiresAt,
  };
}

/**
 * `RedeemInvitationResponse` → {@link RedeemedInvitation}, reusing the EXISTING
 * member/token mappers so the session this flow persists is byte-identical to
 * the one signin/switch-tenant persist (`tokenType` is a wire constant and is
 * intentionally dropped — `setAuthCookies` has no use for it).
 */
export function mapRedeemedInvitation(
  dto: RedeemInvitationResponseDto,
): RedeemedInvitation {
  return {
    member: mapMemberResponse(dto.member),
    tokens: mapTokens(dto.tokens),
  };
}

/** Blamed wire field → the closed issue key the form can translate. */
const FIELD_ISSUE: Record<string, InvitationFieldIssue> = {
  password: "passwordInvalid",
  fullName: "fullNameInvalid",
};

function validationFailure(err: unknown): InvitationRedeemFailure {
  const fields =
    (err as { fields?: Array<{ field: string }> }).fields ?? undefined;
  // A 422 blaming `token` is a dead LINK, not something the visitor can fix in
  // the form — surfacing it as a field error would offer an impossible action.
  if (fields?.some((f) => f.field === "token")) return { type: "link-invalid" };
  const issues = (fields ?? [])
    .map((f) => FIELD_ISSUE[f.field])
    .filter((issue): issue is InvitationFieldIssue => Boolean(issue));
  return { type: "invalid-input", issues };
}

/**
 * Normalised {@link ApiError} → {@link InvitationRedeemFailure}.
 *
 * WIRE CASE: IAM's HTTP boundary (`pkg/kit/response.WriteError`) uppercases the
 * Go i18n key via `codeFromKey()`, and `openapi.yaml` documents the same
 * UPPER_SNAKE codes — but the sibling `iam-member.repository` mapper (US-E18.6)
 * matches the LOWERCASE key. Both cannot be right. On a PUBLIC
 * account-creation surface an unmapped code would degrade a precise, actionable
 * message ("this link is dead") into a generic one, so this mapper normalises
 * the case and additionally falls back to the HTTP STATUS. The discrepancy is
 * flagged to `fe-lead` rather than "fixed" here — the sibling mapper is another
 * story's code.
 */
export function mapInvitationRedeemFailure(
  err: unknown,
): InvitationRedeemFailure {
  const code = errorCodeOf(err)?.toUpperCase();
  const status = statusOf(err);

  switch (code) {
    case "INVITATION_INVALID":
      return { type: "link-invalid" };
    case "INVITATION_EXPIRED":
      return { type: "link-expired" };
    case "INVITATION_ACCOUNT_EXISTS":
      return { type: "account-exists" };
    case "USER_WEAK_PASSWORD":
      // 400, not 422: the policy check lives inside RegisterUserUseCase, past
      // the request-tag validator. Same remedy for the user, own copy.
      return { type: "invalid-input", issues: ["passwordWeak"] };
    case "VALIDATION_FAILED":
      return validationFailure(err);
    case "RATE_LIMIT_EXCEEDED":
      return {
        type: "rate-limited",
        retryAfterSeconds: retryAfterSecondsOf(err),
      };
    case "FORBIDDEN_ACTION":
      // The only 403 this pair of endpoints raises: the inviting tenant is not
      // ACTIVE (the caller has no identity yet, so it can never be an RBAC 403).
      return { type: "tenant-inactive" };
    case "NETWORK_ERROR":
      return { type: "network-error" };
  }

  // Unmapped code → keep the user's next action correct using the status alone.
  switch (status) {
    case 403:
      return { type: "tenant-inactive" };
    case 409:
      return { type: "account-exists" };
    case 410:
      return { type: "link-invalid" };
    case 422:
      return validationFailure(err);
    case 429:
      return {
        type: "rate-limited",
        retryAfterSeconds: retryAfterSecondsOf(err),
      };
    default:
      return { type: "unknown" };
  }
}
