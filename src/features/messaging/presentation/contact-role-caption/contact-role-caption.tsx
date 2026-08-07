"use client";

import { useTranslations } from "next-intl";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import { cn } from "@/shared/utils";
import { contactRoleCaption } from "./contact-role-label";

export interface ContactRoleCaptionProps {
  contact: Pick<ContactEntity, "role" | "roleKey">;
  className?: string;
}

/**
 * The role line under a contact's name, shared by the three pickers that render
 * a `ContactEntity` (new conversation, create group step 2, add members) — one
 * canonical home instead of three copies of the same conditional
 * (`.claude/rules/component-organization.md`).
 *
 * Renders NOTHING when the contact has no role information: a real narrowed-tier
 * IAM row carries no role text, and an empty caption would imply missing data.
 */
export function ContactRoleCaption({
  contact,
  className,
}: ContactRoleCaptionProps) {
  const t = useTranslations("messaging");
  const caption = contactRoleCaption(contact);
  if (caption === null) return null;

  return (
    <span
      className={cn("block truncate text-muted-foreground text-xs", className)}
    >
      {caption.kind === "key"
        ? t(`contactRole.${caption.roleKey}`)
        : caption.text}
    </span>
  );
}
