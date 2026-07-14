"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { PresenceRecord } from "@/features/messaging/domain/entities/presence";
import { AddMembersModal } from "../add-members-modal";
import { ChatWindow } from "../chat-window/chat-window";
import { ConversationList } from "../conversation-list/conversation-list";
import { CreateGroupModal } from "../create-group-modal";
import { NewConversationModal } from "../new-conversation-modal/new-conversation-modal";
import { EmptyMessagingState } from "./empty-messaging-state";
import type {
  MessagingScreenActions,
  MessagingScreenVM,
} from "./messaging-screen.i-vm";
import {
  chatPaneClass,
  listPaneClass,
  paneAriaHidden,
  paneInert,
} from "./pane-visibility";
import { useIsMobile } from "./use-is-mobile";

export interface MessagingScreenProps
  extends MessagingScreenVM,
    MessagingScreenActions {}

const messagesKey = (id: string) => ["messaging", "messages", id] as const;
const conversationsKey = () => ["messaging", "conversations"] as const;
const groupKey = (id: string) => ["messaging", "group", id] as const;
// US-E10.6 — presence queries. Both sit under the ["messaging","presence"]
// prefix so the presence.changed SSE invalidation (event-invalidation.ts) hits
// them via prefix match without listing each key.
const presenceListKey = () => ["messaging", "presence", "list"] as const;
const presenceGroupKey = (id: string) =>
  ["messaging", "presence", "group", id] as const;

/** Apply presence records onto direct conversations (group rows untouched). */
function mergeConversationPresence(
  conversations: ConversationEntity[],
  records: PresenceRecord[],
): ConversationEntity[] {
  if (records.length === 0) return conversations;
  const byId = new Map(records.map((r) => [r.memberId, r]));
  return conversations.map((c) => {
    if (c.type !== "direct") return c;
    const rec = byId.get(c.id);
    return rec
      ? { ...c, presence: rec.presence, lastActiveAt: rec.lastActiveAt }
      : c;
  });
}

type ReplyState = { messageId: string; senderName: string; excerpt: string };

export function MessagingScreen({
  initialConversations,
  initialContacts,
  loadError,
  selfId = "me",
  sendMessageAction,
  createConversationAction,
  getMessagesAction,
  getPresenceAction,
  createGroupAction,
  getGroupAction,
  pinMessageAction,
  deleteMessageAction,
  removeGroupMemberAction,
  addGroupMembersAction,
  leaveGroupAction,
  deleteGroupAction,
  updateGroupAction,
}: MessagingScreenProps) {
  const t = useTranslations("messaging");
  const isMobile = useIsMobile();
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

  // US-E10.6 — direct-contact presence, batched per rendered list. Progressive
  // and non-blocking (NFR-005): rows render immediately with no dot; the dot
  // fills in once this resolves. A failure resolves to [] (offline-equivalent).
  const directContactIds = useMemo(
    () => conversations.filter((c) => c.type === "direct").map((c) => c.id),
    [conversations],
  );
  const { data: presenceRecords = [] } = useQuery({
    queryKey: presenceListKey(),
    queryFn: async () => {
      const res = await getPresenceAction(directContactIds);
      return res.ok ? res.value : [];
    },
    enabled: directContactIds.length > 0,
  });
  const conversationsWithPresence = useMemo(
    () => mergeConversationPresence(conversations, presenceRecords),
    [conversations, presenceRecords],
  );

  const [activeId, setActiveId] = useState<string | null>(
    deepLinkId ?? initialConversations[0]?.id ?? null,
  );
  const [mobilePane, setMobilePane] = useState<"list" | "chat">(
    deepLinkId ? "chat" : "list",
  );
  const [isModalOpen, setModalOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);

  useEffect(() => {
    if (deepLinkId) {
      setActiveId(deepLinkId);
      setMobilePane("chat");
    }
  }, [deepLinkId]);

  const activeConversation = useMemo<ConversationEntity | undefined>(
    () => conversationsWithPresence.find((c) => c.id === activeId),
    [conversationsWithPresence, activeId],
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

  // US-E10.6 — presence for the open group's members (INT-401 scoped to this
  // group). Fetched only once the group itself has loaded; non-blocking.
  const groupMemberIds = useMemo(
    () => group?.members.map((m) => m.userId) ?? [],
    [group],
  );
  const { data: groupPresence = [] } = useQuery({
    queryKey: activeId
      ? presenceGroupKey(activeId)
      : ["messaging", "presence", "group"],
    queryFn: async () => {
      const res = await getPresenceAction(groupMemberIds);
      return res.ok ? res.value : [];
    },
    enabled: Boolean(activeId) && isGroup && groupMemberIds.length > 0,
  });
  const groupWithPresence = useMemo<GroupEntity | undefined>(() => {
    if (!group || groupPresence.length === 0) return group;
    const byId = new Map(groupPresence.map((r) => [r.memberId, r]));
    return {
      ...group,
      members: group.members.map((m) => {
        const rec = byId.get(m.userId);
        return rec
          ? { ...m, presence: rec.presence, lastActiveAt: rec.lastActiveAt }
          : m;
      }),
    };
  }, [group, groupPresence]);

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

  const addMembersMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      if (!activeId) throw new Error("no-active-group");
      const res = await addGroupMembersAction(activeId, memberIds);
      if (!res.ok) throw new Error(res.errorKey);
      return res.value;
    },
    onSuccess: (updatedGroup: GroupEntity) => {
      // Reflect the new member list immediately; the group query is the
      // source of truth for the info panel.
      if (activeId) queryClient.setQueryData(groupKey(activeId), updatedGroup);
      // Keep the conversation list member-count in sync.
      queryClient.setQueryData<ConversationEntity[]>(
        conversationsKey(),
        (old = []) =>
          old.map((c) =>
            c.id === activeId
              ? { ...c, memberCount: updatedGroup.members.length }
              : c,
          ),
      );
      setAddMembersOpen(false);
    },
    onSettled: () => {
      // Revalidate against the server (mock-first) regardless of outcome;
      // on error the previous group data is left intact (no optimistic write).
      if (activeId)
        queryClient.invalidateQueries({ queryKey: groupKey(activeId) });
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
    <div className="relative flex h-[calc(100vh-64px)] overflow-hidden">
      <div
        ref={listPaneRef}
        className={listPaneClass(mobilePane)}
        aria-hidden={paneAriaHidden(isMobile, mobilePane, "list")}
        inert={paneInert(isMobile, mobilePane, "list")}
      >
        <ConversationList
          conversations={conversationsWithPresence}
          activeConversationId={activeId}
          isLoading={isLoading}
          loadError={loadError}
          onSelect={handleSelect}
          onNewMessage={() => setModalOpen(true)}
          onCreateGroup={() => setCreateGroupOpen(true)}
        />
      </div>

      <div
        className={chatPaneClass(mobilePane)}
        aria-hidden={paneAriaHidden(isMobile, mobilePane, "chat")}
        inert={paneInert(isMobile, mobilePane, "chat")}
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
            group={groupWithPresence}
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
              onAddMembers: () => setAddMembersOpen(true),
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

      <AddMembersModal
        open={addMembersOpen}
        contacts={initialContacts.filter(
          (c) => !group?.members.some((m) => m.userId === c.id),
        )}
        isSubmitting={addMembersMutation.isPending}
        submitError={addMembersMutation.isError}
        onOpenChange={setAddMembersOpen}
        onSubmit={(memberIds) => addMembersMutation.mutate(memberIds)}
      />
    </div>
  );
}

type GetGroupResultValue = GroupEntity | undefined;
