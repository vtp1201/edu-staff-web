"use client";

import { SmilePlus } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/shared/utils";
import {
  REACTION_TYPES,
  type ReactionState,
  type ReactionType,
} from "../../../domain/entities/reaction.entity";

const REACTION_EMOJI: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  celebrate: "🎉",
  clap: "👏",
};

export interface FeedReactionBarProps {
  reactions: ReactionState;
  /** Already-translated reaction display names, keyed by type. */
  reactionLabels: Record<ReactionType, string>;
  /** (label, count) → aria-label string (ICU-interpolated by caller). */
  ariaLabel: (label: string, count: number) => string;
  addReactionAriaLabel: string;
  /** Emits the raw reaction the user clicked; the container computes toggle. */
  onReact: (reactionType: ReactionType) => void;
  /** Disable during an in-flight mutation on this post (race guard). */
  disabled?: boolean;
}

/**
 * Reaction chip row (FR-004). Renders a chip per reaction with count > 0 plus a
 * picker for adding any of the four. `aria-pressed` marks the user's own
 * reaction; each chip carries a Vietnamese `aria-label` with the live count
 * (AC-1903.6). Emits only "user clicked X" — add/replace/remove semantics live
 * in the container's optimistic mutation.
 */
export function FeedReactionBar({
  reactions,
  reactionLabels,
  ariaLabel,
  addReactionAriaLabel,
  onReact,
  disabled = false,
}: FeedReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const active = REACTION_TYPES.filter((t) => reactions.counts[t] > 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map((type) => {
        const count = reactions.counts[type];
        const mine = reactions.myReaction === type;
        return (
          <button
            key={type}
            type="button"
            aria-pressed={mine}
            aria-label={ariaLabel(reactionLabels[type], count)}
            disabled={disabled}
            onClick={() => onReact(type)}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold text-[12.5px] transition-colors",
              mine
                ? "border-primary bg-primary/12 font-bold text-primary"
                : "border-border bg-card text-edu-text-secondary hover:bg-muted",
              disabled && "opacity-60",
            )}
          >
            <span aria-hidden="true">{REACTION_EMOJI[type]}</span>
            <span className="tabular-nums">{count}</span>
          </button>
        );
      })}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={addReactionAriaLabel}
            disabled={disabled}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border border-dashed text-edu-text-secondary hover:bg-muted disabled:opacity-60"
          >
            <SmilePlus aria-hidden="true" className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-auto gap-1 p-1.5">
          {REACTION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-label={reactionLabels[type]}
              title={reactionLabels[type]}
              onClick={() => {
                onReact(type);
                setPickerOpen(false);
              }}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100",
                reactions.myReaction === type && "bg-primary/12",
              )}
            >
              <span aria-hidden="true">{REACTION_EMOJI[type]}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
