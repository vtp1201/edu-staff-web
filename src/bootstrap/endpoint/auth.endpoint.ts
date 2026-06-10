/** IAM endpoints — names aligned to `edu-api/services/iam/docs/INTEGRATION.md`. */
export const AUTH_EP = {
  register: "/auth/register",
  signin: "/auth/signin",
  social: "/auth/social",
  refresh: "/auth/refresh",
  signout: "/auth/signout",
  me: "/users/me",
  forgotPassword: "/auth/password/forgot",
  resetPassword: "/auth/password/reset",
} as const;
