import { makeListInvitationsUseCase } from "@/bootstrap/di/admin-invitations.di";
import { InvitationsScreen } from "@/features/admin/invitations/presentation/invitations-screen/invitations-screen";
import {
  refreshInvitationsAction,
  resendInvitationAction,
  revokeInvitationAction,
  sendInvitationBatchAction,
} from "./actions";

/**
 * Admin tenant invitations (US-E21.1). RBAC is enforced by the `/admin/*`
 * layout (decision 0022/0024) — no route-guard here. The list is RSC-seeded
 * from the (permanently-mocked) `listInvitations` use-case; the client screen
 * takes over refetch + mutations. Send/revoke are real; list/resend are mock.
 */
export default async function InvitationsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const result = await makeListInvitationsUseCase().then((uc) => uc.execute());

  return (
    <InvitationsScreen
      initialInvitations={result.ok ? result.value : []}
      initialLoadFailed={!result.ok}
      tenantId={tenant}
      onRefresh={refreshInvitationsAction}
      onSendBatch={sendInvitationBatchAction}
      onResend={resendInvitationAction}
      onRevoke={revokeInvitationAction}
    />
  );
}
