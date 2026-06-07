/** Tenant/membership endpoints (IAM, BE US-020). camelCase wire (decision 0017). */
export const TENANT_EP = {
  myTenants: "/members/me/tenants",
  switchTenant: "/members/switch-tenant",
} as const;

/** OAuth client id sent on token-minting calls (switch-tenant). */
export const OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID ?? "edu-staff-web";
