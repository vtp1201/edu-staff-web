"use client";

import { Pencil, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DetailPanelHeader } from "@/components/shared/detail-panel-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { GroupMember } from "@/features/messaging/domain/entities/group.entity";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";
import type {
  GroupInfoPanelActions,
  GroupInfoPanelVM,
} from "./group-info-panel.i-vm";
import { PinnedMessageRow } from "./pinned-message-row";

export interface GroupInfoPanelProps
  extends GroupInfoPanelVM,
    GroupInfoPanelActions {}

export function GroupInfoPanel({
  open,
  group,
  isLoading,
  selfIsAdmin,
  selfId,
  onOpenChange,
  onRename,
  onAddMembers,
  onRemoveMember,
  onLeave,
  onDelete,
  onPinnedClick,
}: GroupInfoPanelProps) {
  const t = useTranslations("messaging.groupInfo");
  const tDialog = useTranslations("messaging.deleteDialog");
  const tGroup = useTranslations("messaging.group");
  const tChat = useTranslations("messaging.chat");
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [desc, setDesc] = useState(group?.description ?? "");

  // Reset transient state whenever the group or open state changes.
  useEffect(() => {
    setEditing(false);
    setDeleteOpen(false);
    setName(group?.name ?? "");
    setDesc(group?.description ?? "");
  }, [group]);

  const canRemove = (m: GroupMember) =>
    selfIsAdmin && m.userId !== selfId && m.role !== "admin";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={t("title")}
        className="w-full gap-0 p-0 sm:max-w-[320px]"
      >
        {/* Radix requires an accessible title/description on the Sheet; keep
            them sr-only and render the visible header via DetailPanelHeader. */}
        <SheetHeader className="sr-only">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("title")}</SheetDescription>
        </SheetHeader>

        <DetailPanelHeader
          backLabel={tChat("backToList")}
          onBack={() => onOpenChange(false)}
          title={t("title")}
          actions={
            selfIsAdmin && !editing && group ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(true)}
                aria-label={t("editName")}
                className="text-muted-foreground"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
            ) : undefined
          }
        />

        {isLoading || !group ? (
          <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground text-sm">
            …
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Avatar section */}
            <div className="flex flex-col items-center gap-2 px-4 py-5">
              <span
                className={cn(
                  "flex size-20 items-center justify-center rounded-[20px] font-extrabold text-xl",
                  avatarToneClasses(group.color),
                )}
                aria-hidden="true"
              >
                {group.name.slice(0, 2).toUpperCase()}
              </span>
              {editing ? (
                <div className="w-full space-y-2">
                  <label htmlFor="group-name" className="sr-only">
                    {t("editName")}
                  </label>
                  <input
                    id="group-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border-[1.5px] border-border bg-background px-3 py-2 text-center font-bold text-foreground text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <label htmlFor="group-edit-desc" className="sr-only">
                    {t("descLabel")}
                  </label>
                  <textarea
                    id="group-edit-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border-[1.5px] border-border bg-background px-3 py-2 text-center text-foreground text-xs outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setName(group.name);
                        setDesc(group.description);
                      }}
                      className="flex-1 rounded-lg border border-border py-2 font-semibold text-foreground text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {tDialog("cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={name.trim().length < 2}
                      onClick={() => {
                        onRename(name.trim(), desc.trim());
                        setEditing(false);
                      }}
                      className="flex-1 rounded-lg bg-primary py-2 font-semibold text-primary-foreground text-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("save")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-center font-extrabold text-base text-foreground">
                    {group.name}
                  </span>
                  {group.description && (
                    <span className="text-center text-muted-foreground text-xs">
                      {group.description}
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2.5 py-0.5 font-semibold text-muted-foreground text-xs">
                    {tGroup("memberCount", {
                      count: group.members.length,
                    })}
                  </span>
                </>
              )}
            </div>

            {/* Members section */}
            <section className="border-border border-t px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-[10.5px] text-muted-foreground uppercase tracking-wide">
                  {t("membersSection")}
                </h3>
                {selfIsAdmin && (
                  <button
                    type="button"
                    onClick={onAddMembers}
                    className="flex items-center gap-1 font-semibold text-primary text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <UserPlus className="size-3.5" aria-hidden="true" />
                    {t("addMembers")}
                  </button>
                )}
              </div>
              <ul className="space-y-0.5">
                {group.members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-2.5 rounded-lg px-1 py-1.5"
                  >
                    <span
                      className={cn(
                        "flex size-8 flex-shrink-0 items-center justify-center rounded-full font-bold text-[11px]",
                        avatarToneClasses(m.color),
                        !m.isOnline && "opacity-60 grayscale",
                      )}
                      aria-hidden="true"
                    >
                      {m.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-foreground text-sm">
                          {m.name}
                          {m.userId === selfId && (
                            <span className="ml-1 text-muted-foreground">
                              {t("memberSelf")}
                            </span>
                          )}
                        </span>
                        {m.role === "admin" && (
                          <span className="rounded-full bg-edu-error-light px-1.5 py-0.5 font-bold text-[10px] text-edu-error-text">
                            {t("adminBadge")}
                          </span>
                        )}
                      </span>
                    </span>
                    {canRemove(m) && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(m.userId)}
                        aria-label={t("removeMemberAria", { name: m.name })}
                        className="flex size-[22px] flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-edu-error-light hover:text-edu-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Pinned section */}
            <section className="border-border border-t px-4 py-3">
              <h3 className="mb-2 font-bold text-[10.5px] text-muted-foreground uppercase tracking-wide">
                {t("pinnedSection")}
              </h3>
              {group.pinnedMessages.length > 0 ? (
                <ul className="space-y-0.5">
                  {group.pinnedMessages.map((p) => (
                    <li key={p.messageId}>
                      <PinnedMessageRow pinned={p} onClick={onPinnedClick} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-center text-muted-foreground text-xs">
                  {t("noPinned")}
                </p>
              )}
            </section>

            {/* Footer */}
            <div className="mt-auto border-border border-t px-4 py-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setLeaveOpen(true)}
                  className="w-full rounded-lg bg-edu-warning/15 py-2.5 font-semibold text-edu-warning-foreground text-sm hover:bg-edu-warning/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("leaveGroup")}
                </button>
                {selfIsAdmin && (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="w-full rounded-lg bg-edu-error-light py-2.5 font-semibold text-edu-error-text text-sm hover:bg-edu-error/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("deleteGroup")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("leaveConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tDialog("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLeaveOpen(false);
                onLeave();
              }}
              className="bg-edu-warning text-edu-warning-foreground hover:bg-edu-warning/90"
            >
              {t("leaveGroup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteGroup")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tDialog("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDeleteOpen(false);
                onDelete();
              }}
              className="bg-edu-error text-edu-error-foreground hover:bg-edu-error/90"
            >
              {t("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
