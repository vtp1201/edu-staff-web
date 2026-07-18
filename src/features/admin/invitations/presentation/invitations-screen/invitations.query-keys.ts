export const invitationKeys = {
  all: () => ["admin-invitations"] as const,
  list: (tenantId: string) => ["admin-invitations", tenantId] as const,
};
