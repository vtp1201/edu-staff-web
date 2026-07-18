import "server-only";
import type { IIamMemberRepository } from "@/features/auth/domain/repositories/i-iam-member.repository";
import type {
  Invitation,
  SendInvitationBatchInput,
} from "../../domain/entities/invitation.entity";
import type { InvitationFailure } from "../../domain/failures/invitation.failure";
import type {
  IInvitationRepository,
  SendBatchOutcome,
} from "../../domain/repositories/i-invitation.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import {
  toInvitation,
  toInvitationFailure,
  toWireRole,
} from "../mappers/invitation.mapper";

/**
 * Adapts the (extended) `IIamMemberRepository` into this feature's narrower
 * `IInvitationRepository` (US-E21.1). Two collaborators are injected so the
 * force-mock scoping is explicit at the type level (class-management.di.ts
 * hybrid-delegate precedent):
 *   - `mutationsIam` — send/revoke; real in real-mode, mock in mock-mode.
 *   - `listIam` — list/resend; ALWAYS the mock (no real BE route, ground-truth
 *     #1/#7).
 *
 * `tenantId` is server-derived by the DI factory (NFR-006), never client input.
 */
export class InvitationRepository implements IInvitationRepository {
  constructor(
    private readonly mutationsIam: IIamMemberRepository,
    private readonly listIam: IIamMemberRepository,
    private readonly tenantId: string,
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
        this.mutationsIam.inviteMember(this.tenantId, {
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
      await this.mutationsIam.revokeInvitation(this.tenantId, invitationId);
      return ok(undefined);
    } catch (err) {
      return fail(toInvitationFailure(err));
    }
  }

  async listInvitations(): Promise<Result<Invitation[], InvitationFailure>> {
    try {
      const list = await this.listIam.listInvitations(this.tenantId);
      return ok(list.map(toInvitation));
    } catch (err) {
      return fail(toInvitationFailure(err));
    }
  }

  async resendInvitation(
    invitationId: string,
  ): Promise<Result<Invitation, InvitationFailure>> {
    try {
      const row = await this.listIam.resendInvitation(
        this.tenantId,
        invitationId,
      );
      return ok(toInvitation(row));
    } catch (err) {
      return fail(toInvitationFailure(err));
    }
  }
}
