import type { TenantCardViewModel } from "@/components/shared/tenant-card";

/**
 * ViewModel contract shared between `page.tsx` (RSC, builds it) and
 * `select-tenant.tsx` (client, renders it) for the post-login select-tenant
 * screen (US-E23.2). The RSC resolves the four-way routing branch
 * (`classifyMembershipCount` + fetch success/failure) into exactly one of these
 * three renderable screen states — the `"single"` branch never reaches the
 * component (it redirects server-side), so it has no variant here.
 */
export type SelectTenantScreenState =
  | { kind: "error" }
  | { kind: "empty" }
  | {
      kind: "cards";
      /** Caller display name for the greeting; `null` → name-less subheading
       *  fallback (AC-001.2, profile fetch was a soft failure). */
      userName: string | null;
      /** ACTIVE membership count for the subheading (`cards.length`). */
      count: number;
      cards: TenantCardViewModel[];
    };
