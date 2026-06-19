/**
 * Weighted term average per TT22 coefficients:
 *   tx1 ×1, tx2 ×1, giuaKy ×2, cuoiKy ×3.
 * Only non-null components contribute to both the weighted sum and the
 * denominator (sum of their coefficients). Returns null when every input is
 * null. Result is rounded to 2 decimals.
 */
export function calculateSubjectAvg(
  tx1: number | null,
  tx2: number | null,
  giuaKy: number | null,
  cuoiKy: number | null,
): number | null {
  const parts: Array<[number | null, number]> = [
    [tx1, 1],
    [tx2, 1],
    [giuaKy, 2],
    [cuoiKy, 3],
  ];

  let weightedSum = 0;
  let coefSum = 0;
  for (const [value, coef] of parts) {
    if (value === null) continue;
    weightedSum += value * coef;
    coefSum += coef;
  }

  if (coefSum === 0) return null;
  return Math.round((weightedSum / coefSum) * 100) / 100;
}
