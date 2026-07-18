/**
 * Pure reader for the one-shot tenant-switch success param
 * (`?switched=1&school=<urlencoded-name>`, US-E23.1). Returns the target school
 * name (possibly empty) when a switch just completed, else `null`. Kept pure so
 * the toast-once + strip semantics are unit-testable in the node env.
 */
export function parseSwitchedParam(
  params: Pick<URLSearchParams, "get">,
): string | null {
  if (params.get("switched") !== "1") return null;
  return params.get("school") ?? "";
}
