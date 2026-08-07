import type { InvitationPreview } from "@/features/auth/domain/entities/invitation-preview.entity";
import type {
  InvitationFieldIssue,
  InvitationRedeemFailure,
} from "@/features/auth/domain/failures/invitation-redeem.failure";

/**
 * ViewModel for the public `/invitations/redeem` screen (US-E18.53, IAM
 * US-191). Derived once server-side in `page.tsx` from the `?token=` param plus
 * the `POST /invitations/lookup` preview — the client component never fetches.
 *
 * No `loading`/`success` variant: submitting is local pending state, and
 * success is a Server Action redirect into the tenant workspace, never a render.
 * `account-exists` is likewise absent — it can only come back from the SUBMIT,
 * so it is a post-submit state inside the form, not a page-load state.
 */
export type InviteRedeemVM =
  /** Preview resolved → show the read-only invitation summary + the form. */
  | { kind: "form"; token: string; preview: InvitationPreview }
  /** Missing/blank token, or a 410 for an unknown/used/REVOKED/replayed link. */
  | { kind: "invalid" }
  /** 410 — the invitation passed its expiry. */
  | { kind: "expired" }
  /** 429 — the per-IP budget shared by lookup+redeem is spent. */
  | { kind: "rate-limited" }
  /** 403 — the inviting school is not active. */
  | { kind: "tenant-inactive" }
  /** Network/unknown — the only state where retrying the SAME link may help. */
  | { kind: "error" };

/**
 * What `redeemAction` resolves to on the FAILURE path (the success path
 * redirects and never returns). Stable keys only — the presentation layer
 * translates them (`.claude/rules/i18n.md`).
 *
 * Declared here rather than in `actions.ts` because a `'use server'` module
 * cannot export a type (it breaks the build).
 */
export interface RedeemInvitationActionResult {
  errorKey?: InvitationRedeemFailure["type"];
  /** Present only for `invalid-input` — which field(s) the visitor must fix. */
  issues?: InvitationFieldIssue[];
}
