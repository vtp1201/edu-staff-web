/**
 * US-E18.18 — pure reducer for the inbound typing indicator. A real `typing`
 * SSE frame only drives the indicator for the CURRENTLY-OPEN conversation; a
 * frame for any other room is ignored (returns the current state unchanged).
 *
 * Framework-free so the "different roomId ignored" rule is unit-testable without
 * rendering the screen.
 *
 * @param current the roomId currently showing a typing indicator (or null)
 * @param activeRoomId the conversation the user has open (or null)
 * @param frameRoomId the roomId carried by the incoming typing frame
 * @param typing whether the frame signals typing on/off
 * @returns the next roomId to show a typing indicator for (or null)
 */
export function nextInboundTyping(
  current: string | null,
  activeRoomId: string | null,
  frameRoomId: string,
  typing: boolean,
): string | null {
  // Ignore frames for any conversation other than the open one.
  if (frameRoomId !== activeRoomId) return current;
  return typing ? frameRoomId : null;
}
