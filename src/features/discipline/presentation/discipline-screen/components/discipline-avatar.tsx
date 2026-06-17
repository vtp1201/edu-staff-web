import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/shared/utils";

/** Avatar tone token → tinted fallback bg + text (token-only). */
const TONE_CLASS: Record<string, string> = {
  primary: "bg-primary/15 text-primary",
  success: "bg-edu-success/15 text-edu-success-text",
  warning: "bg-edu-warning/15 text-edu-warning-foreground",
  error: "bg-edu-error/15 text-edu-error-text",
  purple: "bg-edu-purple/15 text-edu-text-primary",
  teal: "bg-edu-teal/15 text-edu-text-primary",
};

export function DisciplineAvatar({
  initials,
  tone,
  size = "default",
  className,
}: {
  initials: string;
  tone: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className} aria-hidden="true">
      <AvatarFallback
        className={cn("font-bold", TONE_CLASS[tone] ?? TONE_CLASS.primary)}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
