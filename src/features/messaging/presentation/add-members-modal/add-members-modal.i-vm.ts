import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";

/** Server/parent → AddMembersModal contract (DEF-02). */
export interface AddMemberModalVM {
  open: boolean;
  /** Contacts eligible to add — the parent filters out current members. */
  contacts: ContactEntity[];
  /**
   * US-E18.52 — set when the SSR contact-directory read failed. Distinguishes
   * "no eligible members left" from "we could not reach the directory".
   */
  contactsError?: MessagingFailure["type"];
  isSubmitting: boolean;
  submitError: boolean;
}

export interface AddMemberModalActions {
  onOpenChange: (open: boolean) => void;
  onSubmit: (memberIds: string[]) => void;
}
