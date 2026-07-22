import {
  makeGetContactsUseCase,
  makeGetConversationsUseCase,
} from "@/bootstrap/di";
import { MessagingScreen } from "@/features/messaging/presentation/messaging-screen";
import {
  addGroupMembersAction,
  createConversationAction,
  createGroupAction,
  deleteGroupAction,
  deleteMessageAction,
  getGroupAction,
  getMessagesAction,
  getPresenceAction,
  leaveGroupAction,
  markConversationReadAction,
  pinMessageAction,
  removeGroupMemberAction,
  sendMessageAction,
  sendTypingIndicatorAction,
  updateGroupAction,
} from "./actions";

export default async function MessagesPage() {
  const [convoUseCase, contactsUseCase] = await Promise.all([
    makeGetConversationsUseCase(),
    makeGetContactsUseCase(),
  ]);
  const [convoResult, contactsResult] = await Promise.all([
    convoUseCase.execute(),
    contactsUseCase.execute(),
  ]);

  return (
    <MessagingScreen
      initialConversations={convoResult.ok ? convoResult.value : []}
      initialContacts={contactsResult.ok ? contactsResult.value : []}
      loadError={convoResult.ok ? undefined : convoResult.failure.type}
      selfId="me"
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
      deleteMessageAction={deleteMessageAction}
      leaveGroupAction={leaveGroupAction}
      deleteGroupAction={deleteGroupAction}
      markConversationReadAction={markConversationReadAction}
      sendTypingIndicatorAction={sendTypingIndicatorAction}
    />
  );
}
