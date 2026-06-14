"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GoogleIcon, VneidIcon } from "@/components/shared/sso-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  LinkedAccount,
  SocialProvider,
} from "@/features/user/domain/entities/linked-account.entity";
import type { LinkedAccountResult } from "@/features/user/domain/repositories/i-linked-accounts.repository";
import { cn } from "@/shared/utils";

const QUERY_KEY = ["linked-accounts"] as const;

const PROVIDER_ORDER: SocialProvider[] = ["vneId", "google"];

export interface LinkedAccountsSectionProps {
  initialData: LinkedAccount[];
  /** Fetch latest status. Defaults wire to the server action at call site. */
  onFetch?: () => Promise<LinkedAccount[]>;
  onLink: (provider: SocialProvider) => Promise<LinkedAccountResult>;
  onUnlink: (provider: SocialProvider) => Promise<LinkedAccountResult>;
}

export function LinkedAccountsSection({
  initialData,
  onFetch,
  onLink,
  onUnlink,
}: LinkedAccountsSectionProps) {
  const t = useTranslations("profile.security.linkedAccounts");
  const queryClient = useQueryClient();

  const { data = initialData } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => (onFetch ? onFetch() : Promise.resolve(initialData)),
    initialData,
    enabled: Boolean(onFetch),
  });

  const setLinked = (provider: SocialProvider, linked: boolean) => {
    queryClient.setQueryData<LinkedAccount[]>(QUERY_KEY, (prev) =>
      (prev ?? initialData).map((a) =>
        a.provider === provider
          ? { ...a, linked, email: linked ? a.email : undefined }
          : a,
      ),
    );
  };

  const ordered = PROVIDER_ORDER.map(
    (p) => data.find((a) => a.provider === p) ?? { provider: p, linked: false },
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="font-bold text-foreground">{t("title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="space-y-3">
          {ordered.map((account) => (
            <LinkedAccountRow
              key={account.provider}
              account={account}
              onLink={onLink}
              onUnlink={onUnlink}
              onOptimistic={setLinked}
              onRollback={setLinked}
              onSettled={() =>
                queryClient.invalidateQueries({ queryKey: QUERY_KEY })
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const PROVIDER_DESC_KEY = {
  vneId: "vneIdDescription",
  google: "googleDescription",
} as const;

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  return (
    <span className="grid size-[42px] place-items-center rounded-[10px] border border-border bg-card">
      {provider === "vneId" ? (
        <VneidIcon className="size-5" />
      ) : (
        <GoogleIcon className="size-5" />
      )}
    </span>
  );
}

function LinkedAccountRow({
  account,
  onLink,
  onUnlink,
  onOptimistic,
  onRollback,
  onSettled,
}: {
  account: LinkedAccount;
  onLink: (provider: SocialProvider) => Promise<LinkedAccountResult>;
  onUnlink: (provider: SocialProvider) => Promise<LinkedAccountResult>;
  onOptimistic: (provider: SocialProvider, linked: boolean) => void;
  onRollback: (provider: SocialProvider, linked: boolean) => void;
  onSettled: () => void;
}) {
  const t = useTranslations("profile.security.linkedAccounts");
  const { provider, linked, email } = account;
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (next: boolean) =>
      next ? onLink(provider) : onUnlink(provider),
    onMutate: (next: boolean) => {
      setError(null);
      onOptimistic(provider, next);
      return { previous: linked };
    },
    onSuccess: (result, next, context) => {
      if (!result.success) {
        onRollback(provider, context.previous);
        setError(next ? t("linkError") : t("unlinkError"));
      }
    },
    onError: (_err, next, context) => {
      onRollback(provider, context?.previous ?? !next);
      setError(next ? t("linkError") : t("unlinkError"));
    },
    onSettled,
  });

  const pending = mutation.isPending;
  const providerName = t(`providers.${provider}`);

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-background px-[18px] py-[14px]">
      <div className="flex items-center gap-4">
        <ProviderIcon provider={provider} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-foreground">
              {providerName}
            </span>
            {linked ? (
              <span className="rounded-full border border-edu-success/30 bg-edu-success/15 px-2.5 py-0.5 text-[10px] font-bold text-edu-success-text">
                {t("linked")}
              </span>
            ) : (
              <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-bold text-edu-text-secondary">
                {t("notLinked")}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-edu-text-secondary">
            {linked && email
              ? t("linkedDescription", { email })
              : t(PROVIDER_DESC_KEY[provider])}
          </p>
        </div>
        {linked ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            aria-busy={pending}
            aria-disabled={pending}
            aria-label={
              pending ? t("unlinking") : `${t("unlink")} ${providerName}`
            }
            onClick={() => {
              if (!pending) mutation.mutate(false);
            }}
          >
            {pending && (
              <Loader2 className="mr-1.5 size-3.5 animate-spin motion-reduce:animate-none" />
            )}
            {pending ? t("unlinking") : t("unlink")}
          </Button>
        ) : (
          <Button
            size="sm"
            className="min-h-[44px]"
            aria-busy={pending}
            aria-disabled={pending}
            aria-label={pending ? t("linking") : `${t("link")} ${providerName}`}
            onClick={() => {
              if (!pending) mutation.mutate(true);
            }}
          >
            {pending && (
              <Loader2 className="mr-1.5 size-3.5 animate-spin motion-reduce:animate-none" />
            )}
            {pending ? t("linking") : t("link")}
          </Button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className={cn("text-xs text-edu-error-text", "pl-[58px]")}
        >
          {error}
        </p>
      )}
    </div>
  );
}
