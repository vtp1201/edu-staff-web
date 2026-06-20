"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import { cn } from "@/shared/utils";
import { ChatWindow } from "../chat-window/chat-window";
import { ConversationList } from "../conversation-list/conversation-list";
import { CreateGroupModal } from "../create-group-modal";
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
const groupKey = (id: string) => ["messaging", "group", id] as const;

type ReplyState = { messageId: string; senderName: string; excerpt: string };

export function MessagingScreen({
  initialConversations,
  initialContacts,
  loadError,
  selfId = "me",
  sendMessageAction,
  createConversationAction,
  getMessagesAction,
  createGroupAction,
  getGroupAction,
  pinMessageAction,
  deleteMessageAction,
  removeGroupMemberAction,
  leaveGroupAction,
  deleteGroupAction,
  updateGroupAction,
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
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

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
  const isGroup = activeConversation?.type === "group";

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: activeId ? messagesKey(activeId) : ["messaging", "messages"],
    queryFn: async () => {
      if (!activeId) return [] as MessageEntity[];
      const res = await getMessagesAction(activeId);
      return res.ok ? res.value : ([] as MessageEntity[]);
    },
    enabled: Boolean(activeId),
  });

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: activeId ? groupKey(activeId) : ["messaging", "group"],
    queryFn: async () => {
      if (!activeId) return undefined;
      const res = await getGroupAction(activeId);
      return res.ok ? res.value : undefined;
    },
    enabled: Boolean(activeId) && isGroup,
  });

  const sendMutation = useMutation({
    mutationFn: async (vars: {
      conversationId: string;
      text: string;
      replyTo?: ReplyState;
    }) => {
      const res = await sendMessageAction(vars.conversationId, vars.text);
      if (!res.ok) throw new Error(res.errorKey);
      return { ...res.value, replyTo: vars.replyTo };
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
        replyTo: vars.replyTo,
        sentAt: new Date().toISOString(),
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

  const pinMutation = useMutation({
    mutationFn: async (vars: { conversationId: string; messageId: string }) => {
      const res = await pinMessageAction(vars.conversationId, vars.messageId);
      if (!res.ok) throw new Error(res.errorKey);
    },
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({
        queryKey: groupKey(vars.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: messagesKey(vars.conversationId),
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (vars: {
      conversationId: string;
      messageId: string;
      sentAt: string;
    }) => {
      const res = await deleteMessageAction(
        vars.conversationId,
        vars.messageId,
        vars.sentAt,
      );
      if (!res.ok) throw new Error(res.errorKey);
    },
    onMutate: async (vars) => {
      const key = messagesKey(vars.conversationId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MessageEntity[]>(key) ?? [];
      queryClient.setQueryData<MessageEntity[]>(key, (old = []) =>
        old.map((m) =>
          m.id === vars.messageId ? { ...m, isDeleted: true } : m,
        ),
      );
      return { previous, key };
    },
    onError: (_e, _v, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({
        queryKey: messagesKey(vars.conversationId),
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (...args: Parameters<typeof createGroupAction>) => {
      const res = await createGroupAction(...args);
      if (!res.ok) throw new Error(res.errorKey);
      return res.value;
    },
    onSuccess: (created: GroupEntity) => {
      const optimistic: ConversationEntity = {
        id: created.conversationId,
        type: "group",
        name: created.name,
        avatarInitials: created.name.slice(0, 2).toUpperCase(),
        color: created.color,
        lastMessage: "",
        lastMessageTime: "",
        unreadCount: 0,
        memberCount: created.members.length,
        selfIsGroupAdmin: true,
      };
      queryClient.setQueryData<ConversationEntity[]>(
        conversationsKey(),
        (old = []) => [optimistic, ...old],
      );
      setCreateGroupOpen(false);
      setActiveId(created.conversationId);
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

  const handleSend = (text: string, replyTo?: ReplyState) => {
    if (!activeId) return;
    sendMutation.mutate({ conversationId: activeId, text, replyTo });
  };

  const refreshGroup = (g: GetGroupResultValue) => {
    if (activeId && g) queryClient.setQueryData(groupKey(activeId), g);
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
          onCreateGroup={() => setCreateGroupOpen(true)}
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
            selfId={selfId}
            group={group}
            groupLoading={groupLoading}
            onPinMessage={(messageId) => {
              if (activeId)
                pinMutation.mutate({ conversationId: activeId, messageId });
            }}
            onDeleteMessage={(messageId) => {
              if (!activeId) return;
              const msg = messages.find((m) => m.id === messageId);
              deleteMessageMutation.mutate({
                conversationId: activeId,
                messageId,
                sentAt: msg?.sentAt ?? new Date().toISOString(),
              });
            }}
            groupActions={{
              onRename: async (name, description) => {
                if (!activeId) return;
                const res = await updateGroupAction(
                  activeId,
                  name,
                  description,
                );
                if (res.ok) refreshGroup(res.value);
              },
              onAddMembers: () => {},
              onRemoveMember: async (userId) => {
                if (!activeId) return;
                const res = await removeGroupMemberAction(activeId, userId);
                if (res.ok) refreshGroup(res.value);
              },
              onLeave: async () => {
                if (!activeId) return;
                const res = await leaveGroupAction(activeId);
                if (res.ok) {
                  queryClient.setQueryData<ConversationEntity[]>(
                    conversationsKey(),
                    (old = []) => old.filter((c) => c.id !== activeId),
                  );
                  setActiveId(null);
                }
              },
              onDelete: async () => {
                if (!activeId) return;
                const res = await deleteGroupAction(activeId);
                if (res.ok) {
                  queryClient.setQueryData<ConversationEntity[]>(
                    conversationsKey(),
                    (old = []) => old.filter((c) => c.id !== activeId),
                  );
                  setActiveId(null);
                }
              },
            }}
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

      <CreateGroupModal
        open={createGroupOpen}
        contacts={initialContacts}
        isSubmitting={createGroupMutation.isPending}
        submitError={createGroupMutation.isError}
        onOpenChange={setCreateGroupOpen}
        onSubmit={(values) => createGroupMutation.mutate(values)}
      />
    </div>
  );
}

type GetGroupResultValue = GroupEntity | undefined;
