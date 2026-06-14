import "server-only";
import { cookies } from "next/headers";
import type {
  AuthTokens,
  AuthUser,
  UserTenantRole,
} from "@/features/auth/domain/entities/auth-user.entity";
import { decodeJwtExp, isAccessExpired } from "./jwt";

export const AUTH_COOKIE = "auth_token";
export const REFRESH_COOKIE = "refresh_token";
export const ACCESS_EXP_COOKIE = "auth_token_exp";
export const SESSION_COOKIE = "session_id";
/** Short-lived bridge cookie carrying role choices for the select-role step. */
export const PENDING_ROLES_COOKIE = "pending_roles";

const ACCESS_MAX_AGE = 60 * 60 * 24 * 7; // 7d
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30d
const PENDING_ROLES_MAX_AGE = 60 * 10; // 10m — just enough to pick a role

function baseOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

/** Cached `exp` (seconds) sibling cookie — avoids re-decoding the JWT. */
export async function getAccessExp(): Promise<number | null> {
  const raw = (await cookies()).get(ACCESS_EXP_COOKIE)?.value;
  const n = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

/** True when the access token is (about to be) expired — server-side only. */
export async function isCurrentAccessExpired(skewSec = 30): Promise<boolean> {
  return isAccessExpired(await getAccessExp(), skewSec);
}

/** Persist a rotated token pair; derives the `exp` sibling from the access JWT. */
export async function setAuthCookies(tokens: AuthTokens): Promise<void> {
  const store = await cookies();
  const opts = baseOptions();
  store.set(AUTH_COOKIE, tokens.accessToken, {
    ...opts,
    maxAge: ACCESS_MAX_AGE,
  });
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...opts,
    maxAge: REFRESH_MAX_AGE,
  });
  store.set(SESSION_COOKIE, tokens.sessionId, {
    ...opts,
    maxAge: REFRESH_MAX_AGE,
  });

  const exp = decodeJwtExp(tokens.accessToken);
  if (exp !== null) {
    store.set(ACCESS_EXP_COOKIE, String(exp), {
      ...opts,
      maxAge: ACCESS_MAX_AGE,
    });
  }
}

/** Minimal payload the select-role screen needs (no token, no PII beyond name). */
export interface PendingRoles {
  userName: string;
  roles: UserTenantRole[];
}

/**
 * Stash the user's name + tenant roles in a short-lived httpOnly cookie so the
 * `/select-role` RSC page can render the choices. No tokens here; the session
 * cookies are already set. Read server-side only.
 */
export async function setPendingRolesCookie(user: AuthUser): Promise<void> {
  const payload: PendingRoles = { userName: user.name, roles: user.roles };
  (await cookies()).set(PENDING_ROLES_COOKIE, JSON.stringify(payload), {
    ...baseOptions(),
    maxAge: PENDING_ROLES_MAX_AGE,
  });
}

export async function getPendingRolesCookie(): Promise<PendingRoles | null> {
  const raw = (await cookies()).get(PENDING_ROLES_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingRoles;
  } catch {
    return null;
  }
}

export async function clearPendingRolesCookie(): Promise<void> {
  (await cookies()).delete(PENDING_ROLES_COOKIE);
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  for (const name of [
    AUTH_COOKIE,
    REFRESH_COOKIE,
    ACCESS_EXP_COOKIE,
    SESSION_COOKIE,
    PENDING_ROLES_COOKIE,
  ]) {
    store.delete(name);
  }
}
