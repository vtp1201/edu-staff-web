"use client";

import { ChevronLeft, ChevronRight, School } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";
import { cn } from "@/shared/utils";
import type { RoleCardVM, RoleSelectVM } from "./role-select.i-vm";

function RoleCard({
  card,
  disabled,
  onSelect,
}: {
  card: RoleCardVM;
  disabled: boolean;
  onSelect: () => void;
}) {
  const tRoles = useTranslations("auth.roles");
  // labelKey is a BE enum literal ("TEACHER"…); the message tree has a `.label`
  // leaf under each. next-intl's typed keys don't infer the template literal,
  // so narrow to the known message-key shape.
  const labelKey = `${card.labelKey}.label` as Parameters<typeof tRoles>[0];
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      aria-label={`${tRoles(labelKey)} — ${card.tenantName}`}
      onClick={onSelect}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      // Dynamic brand tint comes from a CSS var (not a raw hex) — the only
      // place inline style is allowed here (tokens-only rule, dynamic value).
      style={{
        borderColor: hover ? card.colorVar : undefined,
        boxShadow: hover ? `0 4px 14px ${card.colorVar}22` : undefined,
        transform: hover ? "translateY(-1px)" : undefined,
      }}
      className={cn(
        "flex w-full items-center gap-4 rounded-[14px] border-[1.5px] border-border bg-card px-5 py-4 text-left",
        "transition-[transform,border-color,box-shadow] duration-150 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <span
        className="grid size-12 shrink-0 place-items-center rounded-[12px]"
        style={{
          background: `color-mix(in srgb, ${card.colorVar} 12%, transparent)`,
          color: card.colorVar,
        }}
      >
        <card.icon size={22} strokeWidth={1.7} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-extrabold text-[15px] text-foreground">
            {tRoles(labelKey)}
          </span>
          <span
            aria-hidden="true"
            className="rounded-[4px] border border-border bg-edu-bg px-1.5 py-px font-bold text-[10px] tracking-[0.05em] text-edu-text-secondary"
          >
            {card.roleEnum}
          </span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1 text-[12px] text-edu-text-secondary">
            <School size={12} aria-hidden="true" />
            <span className="truncate">{card.tenantName}</span>
          </span>
          {card.tenantCode ? (
            <span className="rounded-[4px] border border-border bg-edu-bg px-1.5 py-px font-semibold text-[10px] tracking-[0.03em] text-edu-text-secondary">
              {card.tenantCode}
            </span>
          ) : null}
        </span>
      </span>

      <ChevronRight
        size={18}
        className="shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  );
}

export function RoleSelectScreen({
  userName,
  roleCount,
  cards,
  onSelectRole,
  onBack,
  isLoading,
  errorKey,
}: RoleSelectVM) {
  const t = useTranslations("auth.selectRole");
  const tErrors = useTranslations("auth.errors");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--edu-bg)] p-6">
      <div className="w-full max-w-[480px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid size-15 place-items-center rounded-[16px] bg-primary text-primary-foreground">
            <School size={28} aria-hidden="true" />
          </span>
          <p className="mt-4 font-bold text-[11px] uppercase tracking-[0.08em] text-edu-text-secondary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 font-extrabold text-[22px] text-foreground">
            {userName}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("roleSummary", { count: roleCount })}
          </p>
        </div>

        {errorKey ? (
          <p
            className="mb-3 text-center text-sm text-edu-error-text"
            role="alert"
          >
            {tErrors(errorKey)}
          </p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {cards.map((card) => (
            <li key={`${card.roleEnum}:${card.tenantId}`}>
              <RoleCard
                card={card}
                disabled={isLoading}
                onSelect={() => onSelectRole(card.roleEnum, card.tenantId)}
              />
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-border px-4 py-3",
            "font-semibold text-[13px] text-muted-foreground",
            "transition-colors hover:border-primary motion-reduce:transition-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {t("backLink")}
        </button>
      </div>
    </div>
  );
}

export function RoleSelectContainer({
  userName,
  roleCount,
  cards,
  onSelectRole,
  onBack,
}: {
  userName: string;
  roleCount: number;
  cards: RoleCardVM[];
  onSelectRole: (
    roleEnum: string,
    tenantId: string,
  ) => Promise<{ errorKey?: AuthFailure["type"] }>;
  onBack: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<AuthFailure["type"] | null>(null);

  function handleSelect(roleEnum: string, tenantId: string) {
    startTransition(async () => {
      const result = await onSelectRole(roleEnum, tenantId);
      setErrorKey(result?.errorKey ?? null);
    });
  }

  function handleBack() {
    startTransition(() => {
      void onBack();
    });
  }

  return (
    <RoleSelectScreen
      userName={userName}
      roleCount={roleCount}
      cards={cards}
      onSelectRole={handleSelect}
      onBack={handleBack}
      isLoading={isPending}
      errorKey={errorKey}
    />
  );
}
