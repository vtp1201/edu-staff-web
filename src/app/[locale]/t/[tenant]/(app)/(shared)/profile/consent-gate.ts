import type { ProfileScreenVM } from "@/features/user/presentation/profile/profile-screen.i-vm";

/**
 * Server-driven parent-consent gate (US-E20.2, AC-007.2). Given the resolved
 * session role, returns the VM fragment to spread onto `<ProfileScreen>`:
 * `{ parentConsent: true }` ONLY for `parent`, an EMPTY object otherwise — so
 * for non-parent roles the `parentConsent` field is genuinely ABSENT (not
 * `false`), never populated on the client. Pure + unit-tested so the omission
 * is provable without rendering the async RSC page.
 */
export function parentConsentVmGate(
  role: string,
): Pick<ProfileScreenVM, "parentConsent"> | Record<string, never> {
  return role === "parent" ? { parentConsent: true } : {};
}
