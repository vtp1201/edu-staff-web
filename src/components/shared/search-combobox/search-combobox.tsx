"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Loader2, SearchIcon, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/shared/utils";

export interface SearchComboboxCandidate {
  id: string;
  primaryLabel: string;
  /** e.g. className (student variant) or phone (parent variant). */
  subLabel?: string;
  avatarUrl?: string;
  /** Caller-computed fallback initials (this component does no name-parsing). */
  avatarInitials?: string;
}

export type SearchComboboxStatus = "idle" | "loading" | "error" | "success";

export interface SearchComboboxProps {
  /** Controlled selection — null = nothing selected. */
  value: SearchComboboxCandidate | null;
  onValueChange: (candidate: SearchComboboxCandidate | null) => void;
  /** Controlled search text (debounce/query state lives OUTSIDE this component). */
  query: string;
  onQueryChange: (query: string) => void;
  /** Fully resolved candidates for the CURRENT query (never filtered here). */
  candidates: SearchComboboxCandidate[];
  status: SearchComboboxStatus;
  /** Already-i18n'd, shown inside the popover when status === "error". */
  errorMessage?: string;
  onRetry?: () => void;

  label: string;
  placeholder: string;
  /** Shown when status === "success" && candidates.length === 0. */
  emptyMessage: string;
  loadingMessage: string;
  clearSelectionAriaLabel: string;
  /** aria-label for the listbox (e.g. "Kết quả tìm học sinh"). */
  listboxAriaLabel: string;
  retryLabel: string;

  /** Caller-driven invalid state (renders the error border + aria-invalid). */
  invalid?: boolean;
  /** Links to the caller's own inline error <p id=...>. */
  describedById?: string;
  disabled?: boolean;
  /** For <label htmlFor> association. */
  id?: string;
}

/**
 * Domain-agnostic searchable combobox (US-E20.1). Composes `Popover`
 * (positioning/open state) + `Command`/cmdk (listbox + keyboard nav) — NOT a
 * feature component (zero domain types). The debounce lives OUTSIDE: this only
 * renders `query`/`candidates`/`status` and reports every keystroke via
 * `onQueryChange`. `Command.shouldFilter={false}` because candidates are
 * server-resolved, not client-filtered (NFR-008). Placed in `components/shared/`
 * (2 in-screen consumers — component-organization.md §2).
 */
export function SearchCombobox({
  value,
  onValueChange,
  query,
  onQueryChange,
  candidates,
  status,
  errorMessage,
  onRetry,
  label,
  placeholder,
  emptyMessage,
  loadingMessage,
  clearSelectionAriaLabel,
  listboxAriaLabel,
  retryLabel,
  invalid = false,
  describedById,
  disabled = false,
  id,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const triggerId = id ?? generatedId;

  const handleSelect = (candidate: SearchComboboxCandidate) => {
    onValueChange(candidate);
    onQueryChange("");
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(null);
    onQueryChange("");
    // Return focus to the (now visible again) trigger.
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={triggerId}
        className="font-bold text-edu-text-secondary text-xs"
      >
        {label}
      </label>

      {value ? (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border border-primary bg-primary/5 px-2.5 py-2",
          )}
        >
          <Avatar className="size-7 shrink-0">
            {value.avatarUrl && <AvatarImage src={value.avatarUrl} alt="" />}
            <AvatarFallback className="text-xs">
              {value.avatarInitials ?? value.primaryLabel.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-foreground text-sm">
              {value.primaryLabel}
            </p>
            {value.subLabel && (
              <p className="truncate text-muted-foreground text-xs">
                {value.subLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label={clearSelectionAriaLabel}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              id={triggerId}
              type="button"
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-invalid={invalid || undefined}
              aria-describedby={describedById}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
                invalid ? "border-edu-error-dark" : "border-border",
              )}
            >
              <SearchIcon
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="truncate text-muted-foreground">
                {placeholder}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            // pointer-events-auto: this popover can be opened from inside a modal
            // Dialog (the create-link dialog), which Radix locks via body
            // { pointer-events: none }; without this the listbox would inherit it
            // and be non-interactive.
            className="pointer-events-auto w-[var(--radix-popover-trigger-width)] p-0"
          >
            <Command shouldFilter={false}>
              <div className="flex h-9 items-center gap-2 border-border border-b px-3">
                <SearchIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <CommandPrimitive.Input
                  data-slot="command-input"
                  autoFocus
                  value={query}
                  onValueChange={onQueryChange}
                  placeholder={placeholder}
                  className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <CommandList aria-label={listboxAriaLabel}>
                {status === "loading" && (
                  <div
                    role="status"
                    className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm"
                  >
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    {loadingMessage}
                  </div>
                )}
                {status === "error" && (
                  <div
                    role="alert"
                    className="flex flex-col items-center gap-2 px-3 py-6 text-center"
                  >
                    <p className="text-edu-error-text text-sm">
                      {errorMessage}
                    </p>
                    {onRetry && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onRetry}
                      >
                        {retryLabel}
                      </Button>
                    )}
                  </div>
                )}
                {status === "success" && candidates.length === 0 && (
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                )}
                {(status === "success" || status === "idle") &&
                  candidates.map((candidate) => (
                    <CommandItem
                      key={candidate.id}
                      value={candidate.id}
                      onSelect={() => handleSelect(candidate)}
                      className="gap-2.5"
                    >
                      <Avatar className="size-7 shrink-0">
                        {candidate.avatarUrl && (
                          <AvatarImage src={candidate.avatarUrl} alt="" />
                        )}
                        <AvatarFallback className="text-xs">
                          {candidate.avatarInitials ??
                            candidate.primaryLabel.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground text-sm">
                          {candidate.primaryLabel}
                        </p>
                        {candidate.subLabel && (
                          <p className="truncate text-muted-foreground text-xs">
                            {candidate.subLabel}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
