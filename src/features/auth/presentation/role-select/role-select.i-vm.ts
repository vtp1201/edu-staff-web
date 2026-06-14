import type { LucideIcon } from "lucide-react";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

/** A single role choice card. Built server-side from the pending_roles cookie. */
export interface RoleCardVM {
  roleEnum: string; // "TEACHER", "ADMIN", …
  appRole: string; // "teacher", "principal", …
  labelKey: string; // i18n key under auth.roles.<enum>.label
  icon: LucideIcon;
  colorVar: string; // e.g. "var(--edu-role-teacher)"
  tenantId: string;
  tenantName: string;
  tenantCode: string | undefined;
}

export interface RoleSelectVM {
  userName: string;
  roleCount: number;
  cards: RoleCardVM[];
  onSelectRole: (roleEnum: string, tenantId: string) => void;
  onBack: () => void;
  isLoading: boolean;
  errorKey: AuthFailure["type"] | null;
}
