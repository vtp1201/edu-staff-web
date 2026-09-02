"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/shared/utils";
import type { ClassRole } from "../../domain/entities/teacher-class.entity";

export interface RoleBadgesSubject {
  id: string;
  name: string;
}

export interface RoleBadgesProps {
  /** Homeroom first — the badge order follows this array. */
  roles: ClassRole[];
  /** Only consulted for the "subject" role; several subjects join into ONE
   *  badge ("GVBM · Toán, Vật lý") rather than one badge per subject. */
  subjects: RoleBadgesSubject[];
  /** `md` is for the class-detail identity header (US-E24.8) next to a 17px
   *  title; the card (default `sm`) uses the design-spec 10.5px. */
  size?: "sm" | "md";
  className?: string;
}

/** The teacher's role(s) in a class, as TEXT badges (never colour alone —
 *  a11y). Shared because US-E24.8's identity header renders the same pair. */
export function RoleBadges({
  roles,
  subjects,
  size = "sm",
  className,
}: RoleBadgesProps) {
  const t = useTranslations("teacherClasses");
  const subjectLabel = subjects.map((s) => s.name).join(", ");
  // 11px = the design-system `caption` floor; never smaller (A11Y-004).
  const sizeClass = size === "md" ? "text-xs" : "text-[11px]";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {roles.includes("homeroom") && (
        <StatusBadge tone="purple" className={sizeClass}>
          {t("homeroomBadge")}
        </StatusBadge>
      )}
      {/* Defensive: a "subject" role with no subject would render a dangling
          "GVBM · " — skip the badge instead of showing broken copy. */}
      {roles.includes("subject") && subjectLabel !== "" && (
        <StatusBadge tone="primary" className={sizeClass}>
          {t("card.roleBadge.subject", { subject: subjectLabel })}
        </StatusBadge>
      )}
    </div>
  );
}
