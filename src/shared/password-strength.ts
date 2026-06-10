/**
 * Password strength = number of satisfied rules (length/upper/number/special),
 * mapped to a 4-segment meter. Pure + testable; the security tab renders it.
 */
export interface PasswordRules {
  length: boolean;
  upper: boolean;
  number: boolean;
  special: boolean;
}

export type StrengthLevel = "empty" | "weak" | "fair" | "strong";

export function checkRules(pw: string): PasswordRules {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

/** Count of satisfied rules (0–4). */
export function strengthScore(pw: string): number {
  const r = checkRules(pw);
  return (
    Number(r.length) + Number(r.upper) + Number(r.number) + Number(r.special)
  );
}

export function strengthLevel(pw: string): StrengthLevel {
  if (pw.length === 0) return "empty";
  const score = strengthScore(pw);
  if (score <= 2) return "weak";
  if (score === 3) return "fair";
  return "strong";
}
