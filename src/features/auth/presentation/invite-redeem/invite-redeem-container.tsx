"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { Member } from "@/features/auth/domain/entities/member.entity";
import type {
  IInvitationRedeemRepository,
  RedeemInvitationCommand,
} from "@/features/auth/domain/repositories/i-invitation-redeem.repository";
import { LookupInvitationUseCase } from "@/features/auth/domain/use-cases/lookup-invitation.use-case";
import { RedeemInvitationUseCase } from "@/features/auth/domain/use-cases/redeem-invitation.use-case";
import { makeBrowserInvitationRedeemRepository } from "@/features/auth/infrastructure/repositories/make-browser-invitation-redeem-repository";
import { lookupVm, runRedeem } from "./invite-redeem-flow";
import { InviteRedeemScreen } from "./invite-redeem-screen";

export interface InviteRedeemContainerProps {
  /** The emailed `?token=` param, passed straight through from the RSC. */
  token: string;
  /** Locale-prefixed `/login`. */
  loginHref: string;
  /** Locale-prefixed `/invitations/accept?token=…` — the 409 way forward. */
  acceptHref: string;
  /** The narrow `finalizeRedeemAction` Server Action, passed in as a prop. */
  onFinalize: (member: Member, tokens: AuthTokens) => Promise<void>;
  /**
   * Test/story seam ONLY. The RSC never passes it, so the browser factory
   * (mock vs real `fetch`) stays the single production composition point.
   */
  repository?: IInvitationRedeemRepository;
}

/**
 * Client host for the PUBLIC invitation redemption (US-E18.59, ADR 0072).
 *
 * Both IAM calls are issued FROM THE BROWSER here so Kong's per-IP rate limit
 * (10/min, shared by lookup and redeem) sees each visitor's own IP instead of
 * this Next server's single egress IP — previously one abusive invitee could
 * 429-lock every other invitee out of account creation.
 *
 * The `QueryClient` is LOCAL to this screen on purpose: `(auth)` has no
 * provider (only `(app)` wraps `ReactQueryProvider`), and adding one to a
 * shared layout for a single public page would widen the blast radius of a
 * pre-account screen.
 */
export function InviteRedeemContainer(props: InviteRedeemContainerProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // NO retry, anywhere: every automatic retry spends one of the ~10
          // per-IP slots the visitor shares between lookup and redeem, so a
          // retry storm would manufacture the 429 it is trying to survive.
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: Number.POSITIVE_INFINITY,
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <InviteRedeemFlow {...props} />
    </QueryClientProvider>
  );
}

function InviteRedeemFlow({
  token,
  loginHref,
  acceptHref,
  onFinalize,
  repository,
}: InviteRedeemContainerProps) {
  const [repo] = useState(
    () => repository ?? makeBrowserInvitationRedeemRepository(),
  );

  // A blank token is a broken link that no request can rescue; `enabled:false`
  // keeps the zero-network short-circuit the RSC had (the shared rate-limit
  // budget must not be spent on a manifestly dead token).
  const hasToken = token.trim() !== "";

  const lookup = useQuery({
    queryKey: ["invitation-lookup", token],
    enabled: hasToken,
    queryFn: async () => {
      const result = await new LookupInvitationUseCase(repo).execute(token);
      // The use-case returns failures; TanStack needs a throw to reach `error`.
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const redeem = useMutation({
    mutationFn: async (command: RedeemInvitationCommand) => {
      const result = await new RedeemInvitationUseCase(repo).execute(command);
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const vm = lookupVm({
    token,
    isPending: lookup.isPending,
    preview: lookup.data,
    error: lookup.error ?? undefined,
  });

  return (
    <InviteRedeemScreen
      vm={vm}
      loginHref={loginHref}
      acceptHref={acceptHref}
      onRedeem={(submitToken, password, fullName) =>
        runRedeem({
          token: submitToken,
          password,
          fullName,
          redeem: redeem.mutateAsync,
          finalize: onFinalize,
        })
      }
    />
  );
}
