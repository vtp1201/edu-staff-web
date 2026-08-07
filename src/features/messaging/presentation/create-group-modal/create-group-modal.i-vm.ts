import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { GroupKind } from "@/features/messaging/domain/entities/group.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";

export interface CreateGroupFormValues {
  name: string;
  description: string;
  kind: GroupKind;
  color: string;
  memberIds: string[];
}

/** Server → client contract for the create-group modal (US-E10.4). */
export interface CreateGroupModalVM {
  open: boolean;
  contacts: ContactEntity[];
  /**
   * US-E18.52 — set when the SSR contact-directory read failed. Distinguishes
   * "no members match" from "we could not reach the directory".
   */
  contactsError?: MessagingFailure["type"];
  /** True while the create mutation is in flight. */
  isSubmitting?: boolean;
  /** Set when the create mutation failed → inline error banner. */
  submitError?: boolean;
}

export interface CreateGroupModalActions {
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateGroupFormValues) => void;
}
