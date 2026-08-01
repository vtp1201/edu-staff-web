import "server-only";
import type { IIamMemberRepository } from "@/features/auth/domain/repositories/i-iam-member.repository";
import type {
  Invitation,
  SendInvitationBatchInput,
} from "../../domain/entities/invitation.entity";
import type { InvitationFailure } from "../../domain/failures/invitation.failure";
import type {
  IInvitationRepository,
  InvitationsPage,
  ListInvitationsParams,
  SendBatchOutcome,
} from "../../domain/repositories/i-invitation.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import {
  applyInvitedByNames,
  toInvitation,
  toInvitationFailure,
  toWireRole,
} from "../mappers/invitation.mapper";

/**
 * Resolve a batch of member userIds to display names. Injected as a FUNCTION
 * (not a repository) so mock mode needs no fake `IamDirectoryRepository`: it
 * simply wires an identity map, since the mock's `invitedBy` already holds a
 * ready-to-display name. Ids the lookup cannot resolve are absent from the Map
 * (BE never reports unknown ids per-id) — the caller applies the fallback.
 */
export type ResolveDisplayNames = (
  ids: string[],
) => Promise<Map<string, string>>;

/**
 * Adapts the shared `IIamMemberRepository` into this feature's narrower
 * `IInvitationRepository` (US-E21.1; list/resend un-mocked in US-E18.29).
 *
 * ONE IAM collaborator: the second one used to exist purely to express
 * "list/resend are force-mocked while send/revoke are real", which US-E18.29
 * retires — all four operations now come from the same (real or mock) source
 * chosen once in `admin-invitations.di.ts`.
 *
 * `tenantId` is server-derived by the DI factory (NFR-006), never client input.
 * `resolveNames` turns the wire's raw `invitedBy` userId into a display name; a
 * failure there NEVER fails the list (AC-3 — secondary lookup, degraded label).
 */
export class InvitationRepository implements IInvitationRepository {
  constructor(
    private readonly iam: IIamMemberRepository,
    private readonly tenantId: string,
    private readonly resolveNames: ResolveDisplayNames,
  ) {}

  async sendInvitationBatch(
    input: SendInvitationBatchInput,
  ): Promise<Result<SendBatchOutcome, InvitationFailure>> {
    const wireRole = toWireRole(input.role);
    // Client-side fan-out of N single-email POSTs (ground-truth #2/#7) — the
    // real send has no batch endpoint. `input.expiryDays` is intentionally NOT
    // forwarded: the real wire has no expiry field (ground-truth #2), the TTL
    // is server-computed; the select is UI-only.
    const settled = await Promise.allSettled(
      input.emails.map((email) =>
        this.iam.inviteMember(this.tenantId, {
          email,
          roles: [wireRole],
        }),
      ),
    );

    const succeeded: SendBatchOutcome["succeeded"] = [];
    const failed: SendBatchOutcome["failed"] = [];
    settled.forEach((r, i) => {
      const email = input.emails[i];
      if (r.status === "fulfilled") {
        // The real inviteMember returns void (fire-and-forget) — no id on the
        // wire. A synthetic id keeps the outcome shape stable; the list refetch
        // that follows a successful send is the authoritative source of real ids.
        succeeded.push({ email, invitationId: `sent-${Date.now()}-${i}` });
      } else {
        failed.push({ email, failure: toInvitationFailure(r.reason) });
      }
    });

    return ok({ succeeded, failed });
  }

  async revokeInvitation(
    invitationId: string,
  ): Promise<Result<void, InvitationFailure>> {
    try {
      await this.iam.revokeInvitation(this.tenantId, invitationId);
      return ok(undefined);
    } catch (err) {
      return fail(toInvitationFailure(err));
    }
  }

  async listInvitations(
    params?: ListInvitationsParams,
  ): Promise<Result<InvitationsPage, InvitationFailure>> {
    try {
      const page = await this.iam.listInvitations(this.tenantId, params);
      const rows = page.data.map(toInvitation);
      return ok({
        data: await this.withInvitedByNames(rows),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      });
    } catch (err) {
      return fail(toInvitationFailure(err));
    }
  }

  async resendInvitation(
    invitationId: string,
  ): Promise<Result<Invitation, InvitationFailure>> {
    try {
      const row = await this.iam.resendInvitation(this.tenantId, invitationId);
      const [resolved] = await this.withInvitedByNames([toInvitation(row)]);
      return ok(resolved);
    } catch (err) {
      return fail(toInvitationFailure(err));
    }
  }

  /**
   * Secondary display lookup — one batch call for the page's UNIQUE inviter ids.
   * It must never fail the caller (AC-3): a rejection degrades to "no names
   * resolved" (blank label + the screen's i18n fallback), not a list failure.
   */
  private async withInvitedByNames(rows: Invitation[]): Promise<Invitation[]> {
    const ids = [...new Set(rows.map((r) => r.invitedBy).filter(Boolean))];
    if (ids.length === 0) return rows;
    let resolved = new Map<string, string>();
    try {
      resolved = await this.resolveNames(ids);
    } catch {
      // Intentionally swallowed — the invitation list is the primary payload.
    }
    return applyInvitedByNames(rows, resolved);
  }
}
