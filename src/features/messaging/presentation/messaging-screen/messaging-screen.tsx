"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRealtimeEvents } from "@/bootstrap/realtime";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { PresenceRecord } from "@/features/messaging/domain/entities/presence";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import { AddMembersModal } from "../add-members-modal";
import { ChatWindow } from "../chat-window/chat-window";
import { ConversationList } from "../conversation-list/conversation-list";
import { CreateGroupModal } from "../create-group-modal";
import { NewConversationModal } from "../new-conversation-modal/new-conversation-modal";
import { EmptyMessagingState } from "./empty-messaging-state";
import { createGroupErrorKey } from "./group-creation-gate";
import { isMessagingErrorKey } from "./messaging-error-key";
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
import { isGroupPresenceQueryEnabled } from "./presence-gating";
import { nextInboundTyping } from "./typing-inbound";
import { createTypingThrottle, type TypingThrottle } from "./typing-throttle";
import { useIsMobile } from "./use-is-mobile";

export interface MessagingScreenProps
  extends MessagingScreenVM,
    MessagingScreenActions {}

/** US-E18.18 — auto-expire a lingering inbound typing indicator (transient). */
const TYPING_INDICATOR_TTL_MS = 6_000;

const messagesKey = (id: string) => ["messaging", "messages", id] as const;
const conversationsKey = () => ["messaging", "conversations"] as const;
const groupKey = (id: string) => ["messaging", "group", id] as const;
// US-E18.51 — the pin board is its OWN query key, not a slice of the group
// query: it is a separate endpoint with a separate gate, and pin/unpin
// invalidate only it (there is no realtime pin signal, so a refetch after the
// 201/204 is the whole freshness story).
const pinnedKey = (id: string) => ["messaging", "pinned", id] as const;
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
  contactsLoadError,
  selfId = "me",
  tenantId,
  canCreateGroup = false,
  sendMessageAction,
  createConversationAction,
  getMessagesAction,
  getPresenceAction,
  createGroupAction,
  getGroupAction,
  pinMessageAction,
  unpinMessageAction,
  getPinnedMessagesAction,
  deleteMessageAction,
  removeGroupMemberAction,
  addGroupMembersAction,
  leaveGroupAction,
  deleteGroupAction,
  updateGroupAction,
  markConversationReadAction,
  sendTypingIndicatorAction,
}: MessagingScreenProps) {
  const t = useTranslations("messaging");
  const tErrors = useTranslations("messaging.errors");
  const tCommon = useTranslations("Common");
  const isMobile = useIsMobile();
  /**
   * Mutations reject with `new Error(errorKey)` (the repo's stable failure key)
   * — translate it here, at the presentation boundary. An unknown message can
   * only come from a non-action throw, so it degrades to the generic pin copy.
   */
  const tFailure = useCallback(
    (err: unknown) => {
      const key = err instanceof Error ? err.message : "";
      return isMessagingErrorKey(key) ? tErrors(key) : tErrors("pin-failed");
    },
    [tErrors],
  );
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
  // US-E18.50 — last failed group action (archive), as a stable failure key.
  const [groupActionError, setGroupActionError] =
    useState<MessagingFailure["type"]>();
  // US-E10.6 AC-10.6.3.2 — lifted from ChatWindow so the member-panel presence
  // query is gated on the panel actually being open, not on group selection.
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

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
      // null, not undefined — TanStack rejects an undefined query result.
      if (!activeId) return null;
      const res = await getGroupAction(activeId);
      return res.ok ? res.value : null;
    },
    enabled: Boolean(activeId) && isGroup,
  });

  // US-E10.6 — presence for the open group's members (INT-401 scoped to this
  // group). AC-10.6.3.2: this is an INDEPENDENT fetch gated on the group-info
  // panel actually being open — selecting a group (rendering its header) must
  // NOT trigger it. Non-blocking once it does run.
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
    enabled: isGroupPresenceQueryEnabled({
      hasActiveConversation: Boolean(activeId),
      isGroup,
      isPanelOpen: groupInfoOpen,
      memberCount: groupMemberIds.length,
    }),
  });
  const groupWithPresence = useMemo<GroupEntity | undefined>(() => {
    if (!group || groupPresence.length === 0) return group ?? undefined;
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

  // US-E18.51 — the room pin board. Its own query key (own endpoint, own gate),
  // enabled for the active GROUP conversation rather than only while the panel
  // is open: pin/unpin have NO realtime signal, so their invalidation must be
  // able to trigger a real refetch even when the panel is closed (otherwise the
  // board would be silently stale the next time it opens). One extra read per
  // opened group against the 120/min quota it shares with message history —
  // the same order of cost as the history read itself.
  const {
    data: pinnedResult,
    isLoading: pinnedLoading,
    isFetching: pinnedFetching,
  } = useQuery({
    queryKey: activeId ? pinnedKey(activeId) : ["messaging", "pinned"],
    queryFn: async () => {
      if (!activeId) return { ok: true as const, value: [] };
      return getPinnedMessagesAction(activeId);
    },
    enabled: Boolean(activeId) && isGroup,
  });
  const pinnedMessages = pinnedResult?.ok ? pinnedResult.value : [];
  const pinnedError =
    pinnedResult?.ok === false ? pinnedResult.errorKey : undefined;

  const pinMutation = useMutation({
    mutationFn: async (vars: { conversationId: string; messageId: string }) => {
      const res = await pinMessageAction(vars.conversationId, vars.messageId);
      if (!res.ok) throw new Error(res.errorKey);
    },
    onSuccess: () => toast.success(t("toast.pinned")),
    onError: (err) => toast.error(tFailure(err)),
    onSettled: (_d, _e, vars) => {
      // No realtime pin signal exists — refetch the board (and the messages,
      // whose isPinned flag the mock world tracks) after the 201.
      queryClient.invalidateQueries({
        queryKey: pinnedKey(vars.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: messagesKey(vars.conversationId),
      });
    },
  });

  const unpinMutation = useMutation({
    mutationFn: async (vars: { conversationId: string; messageId: string }) => {
      const res = await unpinMessageAction(vars.conversationId, vars.messageId);
      if (!res.ok) throw new Error(res.errorKey);
    },
    onSuccess: () => toast.success(t("toast.unpinned")),
    onError: (err) => toast.error(tFailure(err)),
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({
        queryKey: pinnedKey(vars.conversationId),
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
        // US-E18.50: the real 201 echoes no membership, so `members` is empty
        // there. The contract still GUARANTEES the creator is seeded as OWNER,
        // so "at least 1" is an inference from the contract, not invented data;
        // the next room read replaces it with the server-confirmed count.
        memberCount: Math.max(created.members.length, 1),
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

  // US-E18.17 — opening a conversation marks it read. Optimistically zero the
  // local unread badge (same visible behavior as before) then fire the
  // server-side round-trip best-effort (mock mode: local reset). Runs whenever
  // the active conversation changes — covers select, deep-link, and initial.
  const markRead = useCallback(
    (id: string) => {
      queryClient.setQueryData<ConversationEntity[]>(
        conversationsKey(),
        (old = []) =>
          old.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      );
      void markConversationReadAction?.(id).catch(() => {
        /* best-effort: never surface a mark-read failure */
      });
    },
    [queryClient, markConversationReadAction],
  );

  useEffect(() => {
    if (activeId) markRead(activeId);
  }, [activeId, markRead]);

  // US-E18.17 — outbound typing signal, throttled per active conversation so the
  // composer's onChange never hammers the ~3s server cooldown. Fire-and-forget:
  // any failure (incl. 429) is swallowed and never blocks composing/sending.
  const typingThrottleRef = useRef<TypingThrottle | null>(null);
  useEffect(() => {
    if (!activeId || !sendTypingIndicatorAction) {
      typingThrottleRef.current = null;
      return;
    }
    typingThrottleRef.current = createTypingThrottle(() => {
      void sendTypingIndicatorAction(activeId, true).catch(() => {
        /* best-effort: typing failures are silent */
      });
    });
  }, [activeId, sendTypingIndicatorAction]);
  const handleTyping = useCallback(() => {
    typingThrottleRef.current?.fire();
  }, []);

  // US-E18.17 deferred item, closed in US-E18.18 — INBOUND typing indicator.
  // A screen-scoped realtime subscription (same hook as the shell) drives the
  // chat-window's dormant `isTyping` prop, but ONLY for the currently-open
  // conversation (nextInboundTyping ignores frames for other rooms). Disabled
  // when no tenantId (standalone Storybook) → no EventSource is opened.
  const [typingRoomId, setTypingRoomId] = useState<string | null>(null);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useRealtimeEvents({
    tenantId: tenantId ?? "",
    enabled: Boolean(tenantId),
    onTyping: (roomId, _userId, typing) => {
      setTypingRoomId((prev) =>
        nextInboundTyping(prev, activeIdRef.current, roomId, typing),
      );
      // Transient frames: auto-expire a lingering typing:true for the open room.
      if (typing && roomId === activeIdRef.current) {
        if (typingClearTimerRef.current) {
          clearTimeout(typingClearTimerRef.current);
        }
        typingClearTimerRef.current = setTimeout(() => {
          setTypingRoomId((prev) => (prev === roomId ? null : prev));
        }, TYPING_INDICATOR_TTL_MS);
      }
    },
  });
  useEffect(
    () => () => {
      if (typingClearTimerRef.current)
        clearTimeout(typingClearTimerRef.current);
    },
    [],
  );
  const isTypingForActive = typingRoomId !== null && typingRoomId === activeId;

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
      {/* US-E18.50 — archiving a group can fail for a reason the user can act
          on (a system-provisioned room is not archivable; only the owner may
          archive), so the failure gets a real, dismissible surface instead of
          being dropped on the floor. */}
      {groupActionError && (
        <div
          role="alert"
          className="absolute inset-x-0 top-0 z-20 flex items-start gap-2 border-edu-error/30 border-b bg-edu-error-light px-4 py-2.5 text-edu-error-text text-sm"
        >
          <span className="flex-1">{tErrors(groupActionError)}</span>
          <button
            type="button"
            onClick={() => setGroupActionError(undefined)}
            aria-label={tCommon("close")}
            className="rounded-md p-0.5 hover:bg-edu-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
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
          // US-E18.50: STUDENT/PARENT get no create-group affordance at all —
          // the list renders the CTA only when the handler is present.
          onCreateGroup={
            canCreateGroup ? () => setCreateGroupOpen(true) : undefined
          }
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
            isTyping={isTypingForActive}
            onSend={handleSend}
            onTyping={handleTyping}
            onBack={handleBack}
            inputRef={chatInputRef}
            selfId={selfId}
            group={groupWithPresence}
            groupLoading={groupLoading}
            onGroupInfoOpenChange={setGroupInfoOpen}
            pinnedMessages={pinnedMessages}
            pinnedLoading={pinnedLoading || pinnedFetching}
            pinnedError={pinnedError}
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
              onUnpin: (messageId) => {
                if (activeId)
                  unpinMutation.mutate({ conversationId: activeId, messageId });
              },
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
                setGroupActionError(undefined);
                const res = await deleteGroupAction(activeId);
                if (res.ok) {
                  queryClient.setQueryData<ConversationEntity[]>(
                    conversationsKey(),
                    (old = []) => old.filter((c) => c.id !== activeId),
                  );
                  setActiveId(null);
                } else {
                  // Distinct keys survive to the copy: "system-managed group"
                  // vs "owner only" vs a generic retryable failure.
                  setGroupActionError(res.errorKey);
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
        contactsError={contactsLoadError}
        onOpenChange={setModalOpen}
        onSelectContact={handleSelectContact}
      />

      {canCreateGroup && (
        <CreateGroupModal
          open={createGroupOpen}
          isSubmitting={createGroupMutation.isPending}
          submitError={createGroupErrorKey(createGroupMutation.error)}
          onOpenChange={setCreateGroupOpen}
          onSubmit={(values) => createGroupMutation.mutate(values)}
        />
      )}

      <AddMembersModal
        open={addMembersOpen}
        contacts={initialContacts.filter(
          (c) => !group?.members.some((m) => m.userId === c.id),
        )}
        contactsError={contactsLoadError}
        isSubmitting={addMembersMutation.isPending}
        submitError={addMembersMutation.isError}
        onOpenChange={setAddMembersOpen}
        onSubmit={(memberIds) => addMembersMutation.mutate(memberIds)}
      />
    </div>
  );
}

type GetGroupResultValue = GroupEntity | undefined;
