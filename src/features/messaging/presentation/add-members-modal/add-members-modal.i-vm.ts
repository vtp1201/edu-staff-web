import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";

/** Server/parent → AddMembersModal contract (DEF-02). */
export interface AddMemberModalVM {
  open: boolean;
  /** Contacts eligible to add — the parent filters out current members. */
  contacts: ContactEntity[];
  isSubmitting: boolean;
  submitError: boolean;
}

export interface AddMemberModalActions {
  onOpenChange: (open: boolean) => void;
  onSubmit: (memberIds: string[]) => void;
}
