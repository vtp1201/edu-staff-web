import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";

/**
 * What (if anything) to render under a contact's name.
 *
 * `key` → a REAL directory contact: translate `messaging.contactRole.<roleKey>`.
 * `text` → a seeded mock contact carrying its own free-text caption.
 * `null` → nothing honest to show; the caller must OMIT the line entirely
 * rather than render an empty/placeholder caption (US-E18.52: the narrowed IAM
 * tier carries no role text, and a blank line reads as "missing data").
 */
export type ContactRoleCaptionModel =
  | { kind: "key"; roleKey: NonNullable<ContactEntity["roleKey"]> }
  | { kind: "text"; text: string }
  | null;

export function contactRoleCaption(
  contact: Pick<ContactEntity, "role" | "roleKey">,
): ContactRoleCaptionModel {
  if (contact.roleKey) return { kind: "key", roleKey: contact.roleKey };
  const text = contact.role?.trim();
  return text ? { kind: "text", text } : null;
}
