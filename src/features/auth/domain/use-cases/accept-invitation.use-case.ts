import type { Member } from "../entities/member.entity";
import type { IamMemberFailure } from "../failures/iam-member.failure";
import type { IIamMemberRepository } from "../repositories/i-iam-member.repository";

/**
 * Discriminated result (matches the `AuthResult`/`LoginUseCase` convention the
 * calling Server Action needs), even though the underlying repository throws a
 * typed `IamMemberFailure`. Two conventions coexist in this repo (ADR-noted in
 * US-E21.2's plan) — the interface keeps its throw contract, the use-case
 * adapts it to `{data,error}` for ergonomic callers.
 */
export type AcceptInvitationResult =
  | { data: Member; error?: never }
  | { data?: never; error: IamMemberFailure };

/**
 * Accept a tenant invitation for the already-authenticated caller (ADR 0059).
 * Client-side empty/whitespace-token short-circuit fires with ZERO network call
 * (the AC equivalent of the dropped preview short-circuit, applied to the only
 * real call site left).
 */
export class AcceptInvitationUseCase {
  constructor(private readonly repo: IIamMemberRepository) {}

  async execute(token: string): Promise<AcceptInvitationResult> {
    if (!token.trim()) return { error: { type: "invitation-invalid" } };
    try {
      return { data: await this.repo.acceptInvitation(token) };
    } catch (err) {
      return { error: err as IamMemberFailure };
    }
  }
}
