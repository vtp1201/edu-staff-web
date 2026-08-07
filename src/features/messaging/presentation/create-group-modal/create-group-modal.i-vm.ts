import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";

/**
 * US-E18.50 — creation collects a NAME and nothing else. The real
 * `POST /rooms/groups` body is `{name}` only (BE US-193, ADR 0132): the room
 * has no description/kind/colour column, and there is no batch-add surface, so
 * members are added after the group exists. Collecting fields the server drops
 * would be a UI that lies, so they are gone from the form as well as the type.
 */
export interface CreateGroupFormValues {
  name: string;
}

/** Server → client contract for the create-group modal (US-E10.4). */
export interface CreateGroupModalVM {
  open: boolean;
  /** True while the create mutation is in flight. */
  isSubmitting?: boolean;
  /**
   * Stable failure key of the last failed create, or `undefined`. A key (not a
   * boolean) so the banner can distinguish "not permitted for your role"
   * (`create-group-forbidden`, retrying never helps) from a retryable failure.
   */
  submitError?: MessagingFailure["type"];
}

export interface CreateGroupModalActions {
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateGroupFormValues) => void;
}
