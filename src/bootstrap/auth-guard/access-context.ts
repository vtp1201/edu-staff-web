import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";

export type AccessVerdict =
  | "allowed"
  | "unauthenticated"
  | "tenant-mismatch"
  | "forbidden-role";

export function evaluateAccess(args: {
  role: UserRole | null;
  tokenTenantId: string | null;
  urlTenantId: string;
  requiredRoles?: readonly UserRole[];
}): AccessVerdict {
  if (args.role === null) return "unauthenticated";
  if (!args.tokenTenantId || args.tokenTenantId !== args.urlTenantId)
    return "tenant-mismatch";
  if (args.requiredRoles && !args.requiredRoles.includes(args.role))
    return "forbidden-role";
  return "allowed";
}
