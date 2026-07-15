"use client";

import { ChevronDown, Globe, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/shared/utils";
import type { FeedClassOption } from "../feed-screen.i-vm";

export interface ScopeTabsProps {
  myClasses: FeedClassOption[];
  /** "school" | classId — active tab id. */
  activeScope: string;
  onSelectScope: (scope: string) => void;
}

const TAB_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 font-semibold text-[13px] transition-colors";

/**
 * Scope tablist (FR-001). Hand-rolled `role=tablist` with MANUAL activation
 * (arrow keys move focus; Enter/Space/click activates — AC-1901.7), matching
 * the `ChildSelector` precedent (Radix `Tabs`' auto-activation doesn't fit).
 * When the viewer belongs to >1 class the class tab opens a `role=listbox`
 * popover (built on `ui/Popover` — no `ui/listbox` primitive exists).
 */
export function ScopeTabs({
  myClasses,
  activeScope,
  onSelectScope,
}: ScopeTabsProps) {
  const t = useTranslations("feed");
  const [listboxOpen, setListboxOpen] = useState(false);
  const schoolRef = useRef<HTMLButtonElement>(null);
  const classRef = useRef<HTMLButtonElement>(null);

  const multiClass = myClasses.length > 1;
  const isSchool = activeScope === "school";
  const activeClassId = isSchool
    ? (myClasses[0]?.classId ?? null)
    : activeScope;
  const activeClassName =
    myClasses.find((c) => c.classId === activeClassId)?.className ?? "";

  const moveFocus = (to: "school" | "class") => {
    (to === "school" ? schoolRef : classRef).current?.focus();
  };
  const onKeyNav = (e: React.KeyboardEvent, self: "school" | "class") => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveFocus(self === "school" ? "class" : "school");
    }
  };

  const activateClassTab = () => {
    // Multi-class: always open the listbox chooser first — never silently jump
    // to a specific class (A11Y-002). Single-class: no listbox exists, so
    // activate that one class directly.
    if (multiClass) setListboxOpen((o) => !o);
    else if (myClasses[0]) onSelectScope(myClasses[0].classId);
  };

  return (
    <div
      role="tablist"
      aria-label={t("scopeTabs.ariaLabel")}
      className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        ref={schoolRef}
        type="button"
        role="tab"
        aria-selected={isSchool}
        tabIndex={isSchool ? 0 : -1}
        onKeyDown={(e) => onKeyNav(e, "school")}
        onClick={() => onSelectScope("school")}
        className={cn(
          TAB_CLASS,
          isSchool
            ? "border-primary bg-primary/12 font-bold text-primary"
            : "border-border bg-card text-edu-text-secondary",
        )}
      >
        <Globe aria-hidden="true" className="size-3.5" />
        {t("scopeTabs.school")}
      </button>

      {myClasses.length > 0 && (
        <Popover open={listboxOpen} onOpenChange={setListboxOpen}>
          <PopoverTrigger asChild>
            <button
              ref={classRef}
              type="button"
              role="tab"
              aria-selected={!isSchool}
              tabIndex={isSchool ? -1 : 0}
              aria-haspopup={multiClass ? "listbox" : undefined}
              aria-expanded={multiClass ? listboxOpen : undefined}
              onKeyDown={(e) => onKeyNav(e, "class")}
              onClick={activateClassTab}
              className={cn(
                TAB_CLASS,
                !isSchool
                  ? "border-primary bg-primary/12 font-bold text-primary"
                  : "border-border bg-card text-edu-text-secondary",
              )}
            >
              <Users aria-hidden="true" className="size-3.5" />
              {t("scopeTabs.class", { className: activeClassName })}
              {multiClass && (
                <ChevronDown aria-hidden="true" className="size-3" />
              )}
            </button>
          </PopoverTrigger>
          {multiClass && (
            <PopoverContent
              align="start"
              className="w-auto min-w-[160px] p-1.5"
            >
              <div
                role="listbox"
                aria-label={t("scopeTabs.classListboxAriaLabel")}
                className="flex flex-col"
              >
                {myClasses.map((c) => (
                  <button
                    key={c.classId}
                    type="button"
                    role="option"
                    aria-selected={activeScope === c.classId}
                    onClick={() => {
                      onSelectScope(c.classId);
                      setListboxOpen(false);
                    }}
                    className={cn(
                      "flex min-h-9 w-full items-center rounded-md px-3 py-2 text-left font-semibold text-[12.5px]",
                      activeScope === c.classId
                        ? "bg-primary/12 text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {t("scopeTabs.class", { className: c.className })}
                  </button>
                ))}
              </div>
            </PopoverContent>
          )}
        </Popover>
      )}
    </div>
  );
}
