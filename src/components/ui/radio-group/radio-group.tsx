"use client";

import { CircleIcon } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/utils";

type RadioGroupVariant = "default" | "segmented";

/**
 * Radix radio group. `variant="segmented"` renders a pill toggle (active =
 * filled `bg-primary`/white text) instead of the default circle-indicator
 * radios — a pure visual variant, no new ARIA (root stays native
 * `role="radiogroup"`, arrow-key nav + focus ring inherited). Used by the
 * principal-reports term selector (US-E03.1). Keep it in this primitive per
 * component-organization.md row 1 — do NOT fork a button-group.
 */
function RadioGroup({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root> & {
  variant?: RadioGroupVariant;
}) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      data-variant={variant}
      className={cn(
        variant === "segmented"
          ? "inline-flex gap-1 rounded-[var(--edu-radius-btn)] border border-border bg-card p-1"
          : "grid gap-3",
        className,
      )}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  variant?: RadioGroupVariant;
}) {
  if (variant === "segmented") {
    return (
      <RadioGroupPrimitive.Item
        data-slot="radio-group-item"
        data-variant="segmented"
        className={cn(
          "flex min-h-11 cursor-pointer items-center rounded-[calc(var(--edu-radius-btn)-1px)] px-3.5 py-1.5 text-[13px] font-medium text-edu-text-secondary outline-none transition-colors",
          "hover:text-foreground",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "data-[state=checked]:bg-[var(--edu-primary-accessible)] data-[state=checked]:font-bold data-[state=checked]:text-primary-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </RadioGroupPrimitive.Item>
    );
  }

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
