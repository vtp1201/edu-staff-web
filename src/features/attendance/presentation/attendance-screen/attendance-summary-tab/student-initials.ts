/**
 * Avatar-fallback initials for a student name, shared by the summary table and
 * the alerts aside (US-E24.14 review): the same student appears in both, so a
 * second copy of this rule could drift and show two different avatars for one
 * person.
 *
 * The LAST two words are used because Vietnamese names read family-name first
 * and the given name (last word) is what a teacher scans for.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(-2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
