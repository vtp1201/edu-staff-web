/**
 * `social` service endpoints (US-E10.1). Mock-first until the service ships
 * (decision 0017). No magic strings in repositories.
 */
export const MESSAGING_EP = {
  conversations: "/social/api/v1/conversations",
  conversationMessages: (id: string) =>
    `/social/api/v1/conversations/${id}/messages`,
  createConversation: "/social/api/v1/conversations",
  contacts: "/social/api/v1/contacts",
  // US-E10.4 group lifecycle + message interactions
  groups: "/social/api/v1/groups",
  groupById: (groupId: string) => `/social/api/v1/groups/${groupId}`,
  groupMembers: (groupId: string) => `/social/api/v1/groups/${groupId}/members`,
  groupMemberById: (groupId: string, userId: string) =>
    `/social/api/v1/groups/${groupId}/members/${userId}`,
  conversationLeave: (conversationId: string) =>
    `/social/api/v1/conversations/${conversationId}/leave`,
  messagePin: (conversationId: string, messageId: string) =>
    `/social/api/v1/conversations/${conversationId}/messages/${messageId}/pin`,
  messageById: (conversationId: string, messageId: string) =>
    `/social/api/v1/conversations/${conversationId}/messages/${messageId}`,
} as const;
