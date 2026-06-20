"use client";

import { Copy, CornerUpLeft, Pin, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/shared/utils";
import type {
  MessageContextMenuActions,
  MessageContextMenuVM,
} from "./message-context-menu.i-vm";

const MENU_WIDTH = 200;
const ONE_HOUR_MS = 60 * 60 * 1000;
const VIEWPORT_MARGIN = 8;

export interface MessageContextMenuProps
  extends MessageContextMenuVM,
    MessageContextMenuActions {}

type Item = {
  key: string;
  label: string;
  icon: typeof CornerUpLeft;
  disabled: boolean;
  hint?: string;
  danger?: boolean;
  hidden?: boolean;
  onSelect: () => void;
};

/**
 * Message context menu (US-E10.4). A fixed-position `role="menu"` anchored at the
 * click/long-press coordinates, clamped to the viewport. Arrow keys navigate,
 * Escape closes and restores focus, backdrop click dismisses.
 */
export function MessageContextMenu({
  open,
  x,
  y,
  isMine,
  sentAt,
  isGroup,
  selfIsGroupAdmin,
  onReply,
  onPin,
  onCopy,
  onDelete,
  onClose,
}: MessageContextMenuProps) {
  const t = useTranslations("messaging.contextMenu");
  const hintId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pos, setPos] = useState({ left: x, top: y });

  const pinDisabled = isGroup && !selfIsGroupAdmin;
  const deleteExpired = sentAt
    ? Date.now() - Date.parse(sentAt) > ONE_HOUR_MS
    : true;

  const items: Item[] = [
    {
      key: "reply",
      label: t("reply"),
      icon: CornerUpLeft,
      disabled: false,
      onSelect: onReply,
    },
    {
      key: "pin",
      label: t("pin"),
      icon: Pin,
      disabled: pinDisabled,
      hint: pinDisabled ? t("pinAdminOnly") : undefined,
      onSelect: onPin,
    },
    {
      key: "copy",
      label: t("copy"),
      icon: Copy,
      disabled: false,
      onSelect: onCopy,
    },
    {
      key: "delete",
      label: t("delete"),
      icon: Trash2,
      disabled: deleteExpired,
      danger: true,
      hidden: !isMine,
      hint: deleteExpired ? t("deleteExpired") : undefined,
      onSelect: onDelete,
    },
  ];

  const visibleItems = items.filter((i) => !i.hidden);

  // Clamp to viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const h = menuRef.current?.offsetHeight ?? 0;
    const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN;
    const maxTop = window.innerHeight - h - VIEWPORT_MARGIN;
    setPos({
      left: Math.max(VIEWPORT_MARGIN, Math.min(x, maxLeft)),
      top: Math.max(VIEWPORT_MARGIN, Math.min(y, maxTop)),
    });
  }, [open, x, y]);

  // Focus first enabled item on open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: focus once on open; visibleItems recomputes each render
  useEffect(() => {
    if (!open) return;
    const first = visibleItems.findIndex((i) => !i.disabled);
    itemRefs.current[first === -1 ? 0 : first]?.focus();
  }, [open]);

  const focusByOffset = useCallback(
    (from: number, dir: 1 | -1) => {
      const n = visibleItems.length;
      for (let step = 1; step <= n; step++) {
        const idx = (from + dir * step + n) % n;
        if (!visibleItems[idx].disabled) {
          itemRefs.current[idx]?.focus();
          return;
        }
      }
    },
    [visibleItems],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    const current = itemRefs.current.findIndex(
      (el) => el === document.activeElement,
    );
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusByOffset(current < 0 ? -1 : current, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusByOffset(current < 0 ? 0 : current, -1);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss surface */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        aria-hidden="true"
      />
      <div
        ref={menuRef}
        role="menu"
        aria-label={t("reply")}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{ left: pos.left, top: pos.top, width: MENU_WIDTH }}
        className={cn(
          "fixed z-50 overflow-hidden rounded-[10px] border border-border bg-card py-1.5 shadow-card-hover",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-150",
        )}
      >
        {visibleItems.map((item, idx) => {
          const Icon = item.icon;
          const itemHintId = item.hint ? `${hintId}-${item.key}` : undefined;
          return (
            <div key={item.key}>
              {item.danger && (
                <span
                  aria-hidden="true"
                  className="my-1 block h-px w-full bg-border"
                />
              )}
              <button
                type="button"
                role="menuitem"
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                disabled={item.disabled}
                aria-disabled={item.disabled || undefined}
                aria-describedby={itemHintId}
                onClick={() => {
                  if (item.disabled) return;
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:bg-muted",
                  item.danger
                    ? "text-edu-error hover:bg-edu-error-light"
                    : "text-foreground hover:bg-muted",
                  item.disabled &&
                    "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                <Icon className="size-4 flex-shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
              </button>
              {item.hint && (
                <span
                  id={itemHintId}
                  className="block px-3.5 pb-1 text-[11px] text-muted-foreground"
                >
                  {item.hint}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
