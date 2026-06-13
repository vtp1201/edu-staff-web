/**
 * IAM endpoints — routed through Kong gateway (ADR 0030 / US-E06.3).
 * External call: `POST http://localhost:8000/iam/api/v1/auth/signin`
 * → Kong strips `/iam` → IAM receives `POST /api/v1/auth/signin`.
 * Names aligned to `edu-api/services/iam/docs/INTEGRATION.md`.
 */
export const AUTH_EP = {
  register: "/iam/api/v1/auth/register",
  signin: "/iam/api/v1/auth/signin",
  social: "/iam/api/v1/auth/social",
  refresh: "/iam/api/v1/auth/refresh",
  signout: "/iam/api/v1/auth/signout",
  me: "/iam/api/v1/users/me",
  forgotPassword: "/iam/api/v1/auth/password/forgot",
  resetPassword: "/iam/api/v1/auth/password/reset",
} as const;
