import {
  makeGetContactsUseCase,
  makeGetConversationsUseCase,
} from "@/bootstrap/di";
import { getSessionRole } from "@/bootstrap/lib/session-role.server";
import { MessagingScreen } from "@/features/messaging/presentation/messaging-screen";
import { canCreateGroupFor } from "@/features/messaging/presentation/messaging-screen/group-creation-gate";
import {
  addGroupMembersAction,
  createConversationAction,
  createGroupAction,
  deleteGroupAction,
  deleteMessageAction,
  getGroupAction,
  getMessagesAction,
  getPinnedMessagesAction,
  getPresenceAction,
  leaveGroupAction,
  markConversationReadAction,
  pinMessageAction,
  removeGroupMemberAction,
  sendMessageAction,
  sendTypingIndicatorAction,
  unpinMessageAction,
  updateGroupAction,
} from "./actions";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const [convoUseCase, contactsUseCase] = await Promise.all([
    makeGetConversationsUseCase(),
    makeGetContactsUseCase(),
  ]);
  const [convoResult, contactsResult, sessionRole] = await Promise.all([
    convoUseCase.execute(),
    contactsUseCase.execute(),
    // US-E18.50 — the create-group affordance is role-gated to the same
    // staff tier the real `POST /rooms/groups` allow-list accepts.
    getSessionRole(),
  ]);

  return (
    <MessagingScreen
      initialConversations={convoResult.ok ? convoResult.value : []}
      initialContacts={contactsResult.ok ? contactsResult.value : []}
      loadError={convoResult.ok ? undefined : convoResult.failure.type}
      contactsLoadError={
        contactsResult.ok ? undefined : contactsResult.failure.type
      }
      selfId="me"
      tenantId={tenant}
      canCreateGroup={canCreateGroupFor(sessionRole)}
      sendMessageAction={sendMessageAction}
      createConversationAction={createConversationAction}
      getMessagesAction={getMessagesAction}
      getPresenceAction={getPresenceAction}
      createGroupAction={createGroupAction}
      getGroupAction={getGroupAction}
      updateGroupAction={updateGroupAction}
      removeGroupMemberAction={removeGroupMemberAction}
      addGroupMembersAction={addGroupMembersAction}
      pinMessageAction={pinMessageAction}
      unpinMessageAction={unpinMessageAction}
      getPinnedMessagesAction={getPinnedMessagesAction}
      deleteMessageAction={deleteMessageAction}
      leaveGroupAction={leaveGroupAction}
      deleteGroupAction={deleteGroupAction}
      markConversationReadAction={markConversationReadAction}
      sendTypingIndicatorAction={sendTypingIndicatorAction}
    />
  );
}
