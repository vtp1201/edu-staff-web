/**
 * Move `sourceId` next to `targetId` and return the COMPLETE new ordering.
 *
 * `PUT /courses/{id}/items/order` takes the whole ordering as its body and
 * rejects a partial list, a duplicate or an omission with
 * `404 LMS_ITEM_NOT_FOUND` — writing nothing. Building the full array here, in
 * one pure function shared by BOTH the drag drop and the keyboard
 * "Lên/Xuống" buttons, is what keeps the two interaction paths from drifting
 * into two different request bodies.
 *
 * An id outside `currentIds` THROWS: this function is only ever called with
 * ids taken from the ordering it was handed, so a miss is a programming error,
 * not a user-facing failure — silently dropping it would send BE a partial
 * list that fails as a confusing 404.
 */
export function buildReorderedItemIds(
  currentIds: readonly string[],
  sourceId: string,
  targetId: string,
  position: "before" | "after",
): string[] {
  if (!currentIds.includes(sourceId)) {
    throw new Error(`buildReorderedItemIds: unknown item id "${sourceId}"`);
  }
  if (!currentIds.includes(targetId)) {
    throw new Error(`buildReorderedItemIds: unknown item id "${targetId}"`);
  }
  if (sourceId === targetId) return [...currentIds];

  const rest = currentIds.filter((id) => id !== sourceId);
  const targetIndex = rest.indexOf(targetId);
  const insertAt = position === "before" ? targetIndex : targetIndex + 1;
  return [...rest.slice(0, insertAt), sourceId, ...rest.slice(insertAt)];
}
