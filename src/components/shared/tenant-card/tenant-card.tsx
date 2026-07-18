"use client";

import { Check, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Role } from "@/components/layout/app-shell/sidebar/nav-config";
import { StatusBadge } from "@/components/shared/status-badge";
import type { StatusTone } from "@/components/shared/status-badge/status-badge";
import { cn } from "@/shared/utils";
import type { TenantCardStatus, TenantCardViewModel } from "./tenant-card.i-vm";
import { TenantLogo } from "./tenant-logo";

export interface TenantCardProps {
  viewModel: TenantCardViewModel;
  status: TenantCardStatus;
  /** Always fires on activation; the no-op-on-current guard is the caller's
   *  responsibility (TenantSwitchDialog) so this stays a dumb presentational
   *  leaf, trivially exercised in Storybook. */
  onActivate: (tenantId: string) => void;
  className?: string;
}

/** Role → semantic badge tone (design-system.md "Role → màu"). Unknown role
 *  strings fall back to `muted` (defensive; roles are free-form on the wire). */
const ROLE_TONE: Record<Role, StatusTone> = {
  teacher: "primary",
  principal: "success",
  student: "warning",
  parent: "purple",
  admin: "primary",
};

const KNOWN_ROLES: Role[] = [
  "teacher",
  "principal",
  "student",
  "parent",
  "admin",
];

export function TenantCard({
  viewModel,
  status,
  onActivate,
  className,
}: TenantCardProps) {
  const t = useTranslations("tenant.switch");
  const tRoles = useTranslations("shell.roles");

  const { tenantId, tenantName, address, logoColor, roles, isCurrent } =
    viewModel;
  const rawRole = roles[0] ?? "";
  // Pre-translate the known role labels (typed keys) then look up — keeps the
  // dynamic wire string type-safe (i18n.md: no raw string into t()).
  const roleLabels: Record<Role, string> = {
    teacher: tRoles("teacher"),
    principal: tRoles("principal"),
    student: tRoles("student"),
    parent: tRoles("parent"),
    admin: tRoles("admin"),
  };
  const isKnownRole = (KNOWN_ROLES as string[]).includes(rawRole);
  const roleLabel = isKnownRole ? roleLabels[rawRole as Role] : rawRole;
  const roleTone: StatusTone = isKnownRole
    ? ROLE_TONE[rawRole as Role]
    : "muted";

  const isLoading = status.kind === "loading";
  const isError = status.kind === "error";

  const ariaLabel = t("cardAriaLabel", {
    name: tenantName,
    address,
    role: roleLabel,
    current: isCurrent ? "yes" : "no",
  });

  return (
    <button
      type="button"
      disabled={isLoading}
      aria-current={isCurrent ? "true" : undefined}
      aria-busy={isLoading || undefined}
      aria-label={ariaLabel}
      onClick={() => onActivate(tenantId)}
      className={cn(
        "flex min-h-20 w-full items-center gap-3.5 rounded-[var(--edu-radius-card)] border bg-card px-4 py-3 text-left shadow-card outline-none transition-[box-shadow,transform,border-color]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isCurrent ? "border-primary" : "border-border",
        !isCurrent &&
          !isLoading &&
          "cursor-pointer motion-safe:hover:-translate-y-0.5 hover:shadow-card-hover",
        isLoading && "opacity-70",
        className,
      )}
    >
      <TenantLogo size={56} tenantName={tenantName} accentTone={logoColor} />

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-sm text-foreground">
            {tenantName}
          </span>
          {isCurrent && (
            <StatusBadge tone="success" className="gap-1">
              <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
              {t("current")}
            </StatusBadge>
          )}
        </span>
        {address && (
          <span className="truncate text-xs text-muted-foreground">
            {address}
          </span>
        )}
        <span>
          <StatusBadge tone={roleTone}>{roleLabel}</StatusBadge>
        </span>
        {isError && (
          <span
            role="alert"
            className="text-xs font-medium text-edu-error-text"
          >
            {t("error403")}
          </span>
        )}
      </span>

      {isLoading ? (
        <span
          role="status"
          aria-live="polite"
          className="flex shrink-0 items-center"
        >
          <Loader2
            className="size-5 text-primary motion-safe:animate-spin"
            aria-hidden="true"
          />
          <span className="sr-only">{t("switching")}</span>
        </span>
      ) : (
        !isCurrent && (
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )
      )}
    </button>
  );
}
