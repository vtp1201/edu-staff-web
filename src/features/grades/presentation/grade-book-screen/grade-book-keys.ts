export const gradeBookKeys = {
  all: ["grade-book"] as const,
  book: (csId: string | null, term: string | null) =>
    ["grade-book", csId, term] as const,
  mine: (term: string | null) => ["grade-book", "me", term] as const,
  child: (childId: string | null, term: string | null) =>
    ["grade-book", "child", childId, term] as const,
};
