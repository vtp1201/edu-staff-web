"use client";

import { BookOpen, FileText, Link2, Plus, SquarePen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AddItemKind } from "../course-timeline/course-timeline.i-vm";

export interface AddItemMenuProps {
  /** The week this pill belongs to — its start seeds the new item's `startAt`
   *  (design: "Mục mới có startAt = tuần đang chọn"). Null for "Luôn mở". */
  weekStart: string | null;
  onSelectKind: (kind: AddItemKind, weekStart: string | null) => void;
  /** Resolved by the caller (a locale/tenant-scoped path, not invented here). */
  examBankHref: string;
}

const KINDS: ReadonlyArray<{
  kind: AddItemKind;
  icon: typeof BookOpen;
}> = [
  { kind: "lesson", icon: BookOpen },
  { kind: "assignment", icon: SquarePen },
  { kind: "document", icon: Link2 },
];

/**
 * "+ Thêm mục" per week group.
 *
 * A Radix `DropdownMenu`, not the mockup's raw `<div>` popover: `role="menu"`,
 * `role="menuitem"`, roving arrow-key focus and Escape-to-close-and-restore all
 * come from the primitive rather than from hand-rolled ARIA.
 *
 * The fourth entry is deliberately NOT a create action — an exam is authored in
 * the exam bank and appears on this timeline when it is published (epic ask
 * #6). It renders as a `<Link>` INSIDE a `DropdownMenuItem asChild` so it stays
 * part of the same roving-focus set instead of becoming a bare anchor.
 */
export function AddItemMenu({
  weekStart,
  onSelectKind,
  examBankHref,
}: AddItemMenuProps) {
  const t = useTranslations("courses.teacher.addMenu");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 mb-2 ml-[34px] h-9 rounded-full border-dashed font-bold text-[12px]"
        >
          <Plus className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
          {t("label")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {KINDS.map(({ kind, icon: Icon }) => (
          <DropdownMenuItem
            key={kind}
            onSelect={() => onSelectKind(kind, weekStart)}
            className="gap-2 font-semibold text-[13px]"
          >
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            {t(kind)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2">
          <Link href={examBankHref} className="flex flex-col items-start">
            <span className="flex items-center gap-2 font-semibold text-[13px]">
              <FileText
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              {t("exam")}
            </span>
            {/* The note is part of the item's accessible name on purpose: the
                entry navigates AWAY instead of creating something, and that is
                the only place a teacher learns why. */}
            <span className="pl-6 text-[11px] text-muted-foreground">
              {t("examNote")}
            </span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
