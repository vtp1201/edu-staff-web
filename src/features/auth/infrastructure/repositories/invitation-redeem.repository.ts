import "server-only";
import type { AxiosInstance } from "axios";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import { OAUTH_CLIENT_ID } from "@/bootstrap/endpoint/tenant.endpoint";
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
 * PUBLIC invitation lookup/redeem (IAM US-191, ADR 0130/0131).
 *
 * Both endpoints are unauthenticated, so this repository is constructed with a
 * BARE http client (`createHttpClient()` with no token, see
 * `bootstrap/di/invitation-redeem.di.ts`) — never `createServerHttpClient()`.
 * A stale `auth_token` cookie belonging to a DIFFERENT account must not ride
 * along on an account-creation call.
 *
 * TOKEN HANDLING (the single most important rule here): the invitation token
 * travels in the POST body for both calls and never as a query parameter. The
 * emailed FRONTEND link legitimately carries `?token=` — that is the page URL,
 * not an API call, and matches the existing `invitations/accept?token=`
 * precedent.
 */
export class InvitationRedeemRepository implements IInvitationRedeemRepository {
  constructor(private readonly http: AxiosInstance) {}

  async lookup(token: string): Promise<InvitationPreview> {
    try {
      // Body is EXACTLY { token } — the client volunteers no email/tenant hint.
      const dto = (await this.http.post(IAM_MEMBER_EP.lookupInvitation, {
        token,
      })) as unknown as LookupInvitationResponseDto;
      return mapInvitationPreview(dto);
    } catch (err) {
      throw mapInvitationRedeemFailure(err);
    }
  }

  async redeem(command: RedeemInvitationCommand): Promise<RedeemedInvitation> {
    try {
      const dto = (await this.http.post(
        IAM_MEMBER_EP.redeemInvitation,
        // Fields listed explicitly (not `...command`) so no future field on the
        // command object can silently reach the wire. NO `email`: the account's
        // address is the invitation's, resolved server-side (ADR 0131 D5).
        {
          token: command.token,
          password: command.password,
          fullName: command.fullName,
        },
        // `X-Client-Id` is audit metadata recorded on the issued session, and it
        // is a HEADER because the body shape is fixed by ADR 0131 D5. Reuses the
        // same client id the signin/switch-tenant paths already send.
        { headers: { "X-Client-Id": OAUTH_CLIENT_ID } },
      )) as unknown as RedeemInvitationResponseDto;
      return mapRedeemedInvitation(dto);
    } catch (err) {
      throw mapInvitationRedeemFailure(err);
    }
  }
}
