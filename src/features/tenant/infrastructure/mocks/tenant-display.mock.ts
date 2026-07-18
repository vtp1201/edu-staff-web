import "server-only";
import type {
  TenantAccentTone,
  TenantDisplayFields,
} from "@/components/shared/tenant-card/tenant-card.i-vm";

/**
 * Mock-first tenant display lookup (decision 0014). The IAM `MembershipSummary`
 * wire carries only `tenantId`/`roles`/`status` — display fields
 * (name/address/logoColor) are genuinely absent (confirmed via edu-api's
 * `openapi.yaml`), so both US-E23.1 (header switch dialog) and US-E23.2
 * (post-login select screen) source them from this single deterministic table.
 * Swap the table body for a real field read once BE ships one — the callers
 * (`layout.tsx` enrichment, E23.2 page) are unaffected.
 *
 * Mock/seed data (school names/addresses) is NOT i18n copy — it is data
 * (`.claude/rules/i18n.md` §KHÔNG phải i18n).
 */

const ACCENT_TONES: readonly TenantAccentTone[] = [
  "primary",
  "success",
  "warning",
  "info",
  "purple",
  "teal",
];

/** Curated display for the ids the mock repo seeds (tenant.mock.repository.ts). */
const CURATED: Record<string, TenantDisplayFields> = {
  "tenant-acme": {
    tenantName: "THPT Chu Văn An",
    address: "10 Thụy Khuê, Tây Hồ, Hà Nội",
    logoColor: "primary",
  },
  "tenant-beta": {
    tenantName: "THCS Nguyễn Du",
    address: "44 Hàng Quạt, Hoàn Kiếm, Hà Nội",
    logoColor: "purple",
  },
};

/** Deterministic non-crypto string hash (stable across runs — Storybook/test
 *  snapshot stability; NOT `Math.random()`). */
function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (Math.imul(h, 31) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Resolve presentation-only display fields for a tenant. Unknown ids get a
 * deterministic fallback: the id itself as the label (no invented name), empty
 * address, and a tone chosen by hashing the id into the closed `TenantAccentTone`
 * enum (never a raw hex).
 */
export function resolveTenantDisplay(tenantId: string): TenantDisplayFields {
  const curated = CURATED[tenantId];
  if (curated) return curated;
  return {
    tenantName: tenantId,
    address: "",
    logoColor: ACCENT_TONES[hashString(tenantId) % ACCENT_TONES.length],
  };
}
