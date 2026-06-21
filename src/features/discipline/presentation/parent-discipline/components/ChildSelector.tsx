"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { cn } from "@/shared/utils";
import type { ChildEntity } from "../../../domain/entities/child.entity";

/**
 * Child tab selector (US-E09.4). Rendered as an ARIA tablist with arrow-key
 * navigation. Hidden entirely when the parent has a single child. The active
 * tab is `aria-selected`. avatarColor is a hex string (mock-first, OQ-6) — a
 * dynamic value, so an inline background is allowed.
 */
export function ChildSelector({
  items,
  activeChildId,
  onSelect,
}: {
  items: ChildEntity[];
  activeChildId: string;
  onSelect: (childId: string) => void;
}) {
  const t = useTranslations("discipline.studentConduct.childSelector");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (items.length <= 1) return null;

  const focusTab = (childId: string) => {
    tabRefs.current[childId]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;
    const target = items[next];
    if (target) {
      // Arrow keys move focus only — activation happens on click / Enter / Space
      // (TR-NFR-001, WCAG 2.1.1, ARIA APG manual-activation Tabs pattern).
      focusTab(target.childId);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={t("label")}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {items.map((child, index) => {
        const isActive = child.childId === activeChildId;
        const tabId = `child-tab-${child.childId}`;
        const panelId = `child-panel-${child.childId}`;
        return (
          <button
            key={child.childId}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            ref={(el) => {
              tabRefs.current[child.childId] = el;
            }}
            onClick={() => onSelect(child.childId)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "border-primary bg-primary/12"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-sm text-white"
              style={{ backgroundColor: child.avatarColor }}
              aria-hidden="true"
            >
              {child.avatar}
            </span>
            <span className="flex flex-col items-start">
              <span
                className={cn(
                  "font-bold text-sm",
                  // A11Y-E09.4-004: text-primary (#5D87FF) on bg-primary/12 = 2.89:1 < 3:1.
                  // Use text-foreground for both states; active state is communicated via
                  // border + bg tint (no color-only reliance).
                  "text-foreground",
                )}
              >
                {child.name}
              </span>
              <span className="text-[0.6875rem] text-edu-text-secondary">
                {child.className}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
