import { makeListInvitationsUseCase } from "@/bootstrap/di/admin-invitations.di";
import { InvitationsScreen } from "@/features/admin/invitations/presentation/invitations-screen/invitations-screen";
import type { InvitationsPageVM } from "@/features/admin/invitations/presentation/invitations-screen/invitations-screen.i-vm";
import {
  refreshInvitationsAction,
  resendInvitationAction,
  revokeInvitationAction,
  sendInvitationBatchAction,
} from "./actions";

const EMPTY_PAGE: InvitationsPageVM = {
  data: [],
  nextCursor: null,
  hasMore: false,
};

/**
 * Admin tenant invitations (US-E21.1; list/resend wired real in US-E18.29).
 * RBAC is enforced by the `/admin/*` layout (decision 0022/0024) — no
 * route-guard here. RSC seeds the FIRST page of the default ("all") tab; the
 * client screen owns cursor pagination, per-tab queries and the mutations.
 */
export default async function InvitationsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  // First page of the default tab only (no `status`, no `cursor`).
  const result = await makeListInvitationsUseCase().then((uc) => uc.execute());

  return (
    <InvitationsScreen
      initialPage={result.ok ? result.value : EMPTY_PAGE}
      initialLoadFailed={!result.ok}
      tenantId={tenant}
      onRefresh={refreshInvitationsAction}
      onSendBatch={sendInvitationBatchAction}
      onResend={resendInvitationAction}
      onRevoke={revokeInvitationAction}
    />
  );
}
