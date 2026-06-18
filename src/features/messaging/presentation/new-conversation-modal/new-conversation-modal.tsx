"use client";

import { ArrowRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";

export interface NewConversationModalProps {
  open: boolean;
  contacts: ContactEntity[];
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contact: ContactEntity) => void;
}

export function NewConversationModal({
  open,
  contacts,
  onOpenChange,
  onSelectContact,
}: NewConversationModalProps) {
  const t = useTranslations("messaging");
  const [search, setSearch] = useState("");
  const searchId = useId();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? contacts.filter((c) => c.name.toLowerCase().includes(q))
      : contacts.slice(0, 4);
  }, [contacts, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{t("newMessage.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("newMessage.searchPlaceholder")}
          </DialogDescription>
        </DialogHeader>
        <div className="relative mb-2">
          <Search
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor={searchId} className="sr-only">
            {t("newMessage.searchPlaceholder")}
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("newMessage.searchPlaceholder")}
            className="w-full rounded-lg border-[1.5px] border-border bg-background py-2 pr-2.5 pl-8 text-foreground text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
        </div>
        <p className="mb-1 font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
          {t("newMessage.suggestions")}
        </p>
        <ul aria-label={t("newMessage.suggestions")}>
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelectContact(c)}
                className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="relative flex-shrink-0">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-xs font-bold",
                      avatarToneClasses(c.color),
                    )}
                  >
                    {c.avatarInitials}
                  </span>
                  {c.isOnline && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute right-0.5 bottom-0.5 size-2.5 rounded-full border-2 border-card bg-edu-success"
                      />
                      <span className="sr-only">{t("chat.online")}</span>
                    </>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-foreground text-sm">
                    {c.name}
                  </span>
                  <span className="block truncate text-muted-foreground text-xs">
                    {c.role}
                  </span>
                </span>
                <ArrowRight
                  className="size-3.5 flex-shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
