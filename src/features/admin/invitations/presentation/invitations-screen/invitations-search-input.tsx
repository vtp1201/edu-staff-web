"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export interface InvitationsSearchInputProps {
  /** Committed (debounced) value — controlled so "clear filters" can reset it. */
  value: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
}

const DEBOUNCE_MS = 250;

/**
 * Search box that debounces keystrokes internally (AC-002.2) — the container
 * only sees the committed value. Mirrors TagChipsInput's "ephemeral draft stays
 * local" precedent. Stays in sync when `value` is reset externally.
 */
export function InvitationsSearchInput({
  value,
  placeholder,
  ariaLabel,
  onChange,
}: InvitationsSearchInputProps) {
  const [draft, setDraft] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Keep the local draft in sync when the committed value is reset from outside.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const id = window.setTimeout(() => onChangeRef.current(draft), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [draft, value]);

  return (
    <div className="relative w-full min-w-52 max-w-80">
      <Search
        className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pl-9"
      />
    </div>
  );
}
