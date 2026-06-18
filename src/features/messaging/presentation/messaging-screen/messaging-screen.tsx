"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import { cn } from "@/shared/utils";
import { ChatWindow } from "../chat-window/chat-window";
import { ConversationList } from "../conversation-list/conversation-list";
import { NewConversationModal } from "../new-conversation-modal/new-conversation-modal";
import { EmptyMessagingState } from "./empty-messaging-state";
import type {
  MessagingScreenActions,
  MessagingScreenVM,
} from "./messaging-screen.i-vm";

export interface MessagingScreenProps
  extends MessagingScreenVM,
    MessagingScreenActions {}

const messagesKey = (id: string) => ["messaging", "messages", id] as const;
const conversationsKey = () => ["messaging", "conversations"] as const;

export function MessagingScreen({
  initialConversations,
  initialContacts,
  loadError,
  sendMessageAction,
  createConversationAction,
  getMessagesAction,
}: MessagingScreenProps) {
  const t = useTranslations("messaging");
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const deepLinkId = searchParams?.get("conversation") ?? null;

  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const listPaneRef = useRef<HTMLDivElement>(null);

  const { data: conversations = initialConversations, isLoading } = useQuery({
    queryKey: conversationsKey(),
    queryFn: async () => initialConversations,
    initialData: initialConversations,
  });

  const [activeId, setActiveId] = useState<string | null>(
    deepLinkId ?? initialConversations[0]?.id ?? null,
  );
  const [mobilePane, setMobilePane] = useState<"list" | "chat">(
    deepLinkId ? "chat" : "list",
  );
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (deepLinkId) {
      setActiveId(deepLinkId);
      setMobilePane("chat");
    }
  }, [deepLinkId]);

  const activeConversation = useMemo<ConversationEntity | undefined>(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId],
  );

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: activeId ? messagesKey(activeId) : ["messaging", "messages"],
    queryFn: async () => {
      if (!activeId) return [] as MessageEntity[];
      const res = await getMessagesAction(activeId);
      return res.ok ? res.value : ([] as MessageEntity[]);
    },
    enabled: Boolean(activeId),
  });

  const sendMutation = useMutation({
    mutationFn: async (vars: { conversationId: string; text: string }) => {
      const res = await sendMessageAction(vars.conversationId, vars.text);
      if (!res.ok) throw new Error(res.errorKey);
      return res.value;
    },
    onMutate: async (vars) => {
      const key = messagesKey(vars.conversationId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MessageEntity[]>(key) ?? [];
      const optimistic: MessageEntity = {
        id: `optimistic-${Date.now()}`,
        conversationId: vars.conversationId,
        from: "me",
        text: vars.text,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        date: t("date.today"),
        isPending: true,
      };
      queryClient.setQueryData<MessageEntity[]>(key, [...previous, optimistic]);
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: messagesKey(vars.conversationId),
      });
    },
  });

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobilePane("chat");
    requestAnimationFrame(() => chatInputRef.current?.focus());
  };

  const handleBack = () => {
    setMobilePane("list");
    requestAnimationFrame(() =>
      listPaneRef.current
        ?.querySelector<HTMLButtonElement>('[role="tab"], button')
        ?.focus(),
    );
  };

  const handleSelectContact = async (contact: ContactEntity) => {
    setModalOpen(false);
    const res = await createConversationAction([contact.id]);
    if (res.ok) {
      queryClient.setQueryData<ConversationEntity[]>(
        conversationsKey(),
        (old = []) => [res.value, ...old.filter((c) => c.id !== res.value.id)],
      );
      handleSelect(res.value.id);
    }
  };

  const handleSend = (text: string) => {
    if (!activeId) return;
    sendMutation.mutate({ conversationId: activeId, text });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div
        ref={listPaneRef}
        className={cn(
          "w-full md:flex md:w-[300px]",
          mobilePane === "chat" ? "hidden md:flex" : "flex",
        )}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={activeId}
          isLoading={isLoading}
          loadError={loadError}
          onSelect={handleSelect}
          onNewMessage={() => setModalOpen(true)}
        />
      </div>

      <div
        className={cn(
          "w-full flex-1 md:flex",
          mobilePane === "list" ? "hidden md:flex" : "flex",
        )}
      >
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            isLoading={messagesLoading}
            onSend={handleSend}
            onBack={handleBack}
            inputRef={chatInputRef}
          />
        ) : (
          <EmptyMessagingState onStart={() => setModalOpen(true)} />
        )}
      </div>

      <NewConversationModal
        open={isModalOpen}
        contacts={initialContacts}
        onOpenChange={setModalOpen}
        onSelectContact={handleSelectContact}
      />
    </div>
  );
}
