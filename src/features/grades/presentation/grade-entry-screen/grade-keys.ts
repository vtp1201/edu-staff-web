export const gradeKeys = {
  all: ["grades"] as const,
  sheet: (csId: string | null, term: string | null) =>
    ["grades", csId, term] as const,
};
