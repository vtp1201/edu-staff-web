import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface PLPersonCellProps {
  fullName: string;
  sub: string;
  avatarUrl?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts.at(-1)?.[0] ?? "";
  const first = parts.at(-2)?.[0] ?? parts[0]?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Avatar + name + sub-line — shared by `PLTable` and `PLCardList` so both render
 * the person exactly the same (full data parity, UC-007; no duplication,
 * component-organization.md). Feature-local (single-feature reuse today).
 */
export function PLPersonCell({ fullName, sub, avatarUrl }: PLPersonCellProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="size-9 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="text-xs">
          {initialsOf(fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p
          className="truncate font-bold text-foreground text-sm"
          title={fullName}
        >
          {fullName}
        </p>
        <p className="truncate text-muted-foreground text-xs">{sub}</p>
      </div>
    </div>
  );
}
