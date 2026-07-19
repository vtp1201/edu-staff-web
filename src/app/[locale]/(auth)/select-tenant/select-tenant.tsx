"use client";

import { RotateCw, School } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/bootstrap/i18n/routing";
import {
  runSwitchActivation,
  type SwitchTenantResult,
  TenantCard,
  type TenantCardStatus,
} from "@/components/shared/tenant-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import { logoutAction } from "../login/actions";
import type { SelectTenantScreenState } from "./select-tenant.i-vm";

type Props = {
  screenState: SelectTenantScreenState;
  /** `switchTenantAction` (Path A): redirects on success (throws NEXT_REDIRECT),
   *  returns a discriminated `{ ok:false, errorKey }` on failure. */
  onSwitchTenant: (
    tenantId: string,
    role: string,
  ) => Promise<SwitchTenantResult>;
};

/** Centered auth-shell column (reuses `screens.login` layout, maxWidth 480). */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-120">{children}</div>
    </main>
  );
}

export function SelectTenant({ screenState, onSwitchTenant }: Props) {
  const t = useTranslations("tenant.switch.postLogin");

  if (screenState.kind === "error") {
    return (
      <Shell>
        <ErrorState title={t("errorTitle")} retryLabel={t("errorRetry")} />
      </Shell>
    );
  }

  if (screenState.kind === "empty") {
    return (
      <Shell>
        <EmptyState title={t("emptyTitle")} />
      </Shell>
    );
  }

  return (
    <Shell>
      <CardsState state={screenState} onSwitchTenant={onSwitchTenant} />
    </Shell>
  );
}

/** FR-008 — hard-gate fetch failure: explicit message + user-triggered retry.
 *  Retry re-executes `page.tsx` on the server via `router.refresh()` (no new
 *  Server Action) inside a transition; `isPending` drives the button affordance. */
function ErrorState({
  title,
  retryLabel,
}: {
  title: string;
  retryLabel: string;
}) {
  const t = useTranslations("tenant.switch.postLogin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-center text-center">
      <span
        aria-hidden="true"
        className="mb-4 grid size-15 place-items-center rounded-[var(--edu-radius-role-icon)] bg-edu-error/15 text-edu-error-text"
      >
        <RotateCw className="size-7" strokeWidth={1.5} />
      </span>
      <h1 className="mb-6 text-sm font-medium text-edu-error-text" role="alert">
        {title}
      </h1>
      <Button
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        aria-busy={isPending || undefined}
      >
        <RotateCw
          className={cn("size-4", isPending && "motion-safe:animate-spin")}
          aria-hidden="true"
        />
        {isPending ? t("errorRetrying") : retryLabel}
      </Button>
    </div>
  );
}

/** FR-007 — 0 ACTIVE memberships: explicit empty state with a keyboard-operable
 *  escape action (logout). Native `<form action>` → keyboard-operable by
 *  construction; reuses `logoutAction` (Decision D). */
function EmptyState({ title }: { title: string }) {
  const tShell = useTranslations("shell.header");

  return (
    <div className="flex flex-col items-center text-center">
      <span
        aria-hidden="true"
        className="mb-4 grid size-15 place-items-center rounded-[var(--edu-radius-role-icon)] bg-muted text-muted-foreground"
      >
        <School className="size-7" strokeWidth={1.5} />
      </span>
      <h1 className="mb-6 text-sm font-medium text-foreground">{title}</h1>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          {tShell("logout")}
        </Button>
      </form>
    </div>
  );
}

/** FR-002/003/004 — the card grid: greeting + one `<button>` card per ACTIVE
 *  membership. Per-card activation reuses the exact single-slot state machine
 *  `TenantSwitchDialog` uses (`runSwitchActivation` + one loading/error slot). */
function CardsState({
  state,
  onSwitchTenant,
}: {
  state: Extract<SelectTenantScreenState, { kind: "cards" }>;
  onSwitchTenant: Props["onSwitchTenant"];
}) {
  const t = useTranslations("tenant.switch.postLogin");
  const tSwitch = useTranslations("tenant.switch");
  // A11Y (WCAG 2.4.3) — on mount (skeleton/error/empty → cards branch flip via
  // router.refresh()), move focus to the heading so it doesn't drop to <body>.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const [loadingTenantId, setLoadingTenantId] = useState<string | null>(null);
  // Single-slot error mirroring TenantSwitchDialog: only one card is ever
  // mid-flow (disabled-while-busy), so 403 needs just one inline error slot.
  const [errorTenantId, setErrorTenantId] = useState<string | null>(null);

  const { userName, count, cards } = state;
  const subheading = userName
    ? t("subheadingWithName", { name: userName, count })
    : t("subheadingNoName", { count });

  function handleActivate(tenantId: string) {
    const target = cards.find((m) => m.tenantId === tenantId);
    if (!target) return;
    if (loadingTenantId !== null) return; // guard double / concurrent activation
    setErrorTenantId(null);
    // runSwitchActivation rethrows NEXT_REDIRECT (Risk A) on success — the tree
    // unmounts on navigation, so no cleanup is needed on that path.
    void runSwitchActivation(tenantId, target.roles[0] ?? "", {
      onSwitchTenant,
      onLoading: setLoadingTenantId,
      onForbidden: (id) => setErrorTenantId(id),
      onGenericError: () => toast.error(tSwitch("errorGeneric")),
    });
  }

  function statusFor(tenantId: string): TenantCardStatus {
    if (loadingTenantId === tenantId) return { kind: "loading" };
    if (errorTenantId === tenantId)
      return { kind: "error", reason: "forbidden" };
    return { kind: "idle" };
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="mb-4 grid size-15 place-items-center rounded-[var(--edu-radius-role-icon)] bg-primary text-primary-foreground"
        >
          <School className="size-7" strokeWidth={1.5} />
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mb-1.5 text-2xl font-extrabold text-foreground outline-none"
        >
          {t("heading")}
        </h1>
        <p className="text-sm text-muted-foreground">{subheading}</p>
      </div>

      <div className="grid gap-3">
        {cards.map((m) => (
          <TenantCard
            key={m.tenantId}
            viewModel={m}
            status={statusFor(m.tenantId)}
            onActivate={handleActivate}
          />
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        {t("footnote")}
      </p>
    </div>
  );
}
