export interface TeacherMember {
  userId: string;
  displayName: string;
  /**
   * Staff-tier only (IAM ADR 0129, US-E18.52). `/admin/*` IS a staff-tier
   * surface, so in practice this is always present here — but the directory
   * row it is mapped from no longer guarantees it at the type level, and a
   * fabricated `""` would be a lie. Absent → the picker omits the line.
   */
  email?: string;
}
