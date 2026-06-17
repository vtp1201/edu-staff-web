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
} as const;
