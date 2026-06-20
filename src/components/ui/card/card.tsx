import type * as React from "react";

import { cn } from "@/shared/utils";

function Card({ className, onClick, ...props }: React.ComponentProps<"div">) {
  const base =
    "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm";

  // DR-009 US-E16.3: a clickable card must be keyboard-operable (WCAG 2.1.1).
  // When `onClick` is supplied, the card renders as a native <button> — which
  // is focusable and fires onClick on Enter/Space for free — instead of a
  // <div> with an onClick a keyboard user could never reach. With no onClick it
  // stays a plain, non-interactive container.
  if (onClick) {
    return (
      <button
        type="button"
        data-slot="card"
        onClick={
          onClick as unknown as React.MouseEventHandler<HTMLButtonElement>
        }
        className={cn(
          base,
          "cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
        {...(props as React.ComponentProps<"button">)}
      />
    );
  }

  return <div data-slot="card" className={cn(base, className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
