import type { ConversationResponseDto } from "./conversation-response.dto";

/** Wire shape for a paginated conversation list. */
export type ConversationsListResponseDto = {
  conversations: ConversationResponseDto[];
  meta?: {
    nextCursor?: string;
    hasMore: boolean;
  };
};
