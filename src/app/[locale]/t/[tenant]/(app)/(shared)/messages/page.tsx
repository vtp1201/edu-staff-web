import {
  makeGetContactsUseCase,
  makeGetConversationsUseCase,
} from "@/bootstrap/di";
import { MessagingScreen } from "@/features/messaging/presentation/messaging-screen";
import {
  createConversationAction,
  getMessagesAction,
  sendMessageAction,
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
      sendMessageAction={sendMessageAction}
      createConversationAction={createConversationAction}
      getMessagesAction={getMessagesAction}
    />
  );
}
