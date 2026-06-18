export type Result<T, E> = { ok: true; value: T } | { ok: false; failure: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E>(failure: E): Result<never, E> => ({
  ok: false,
  failure,
});
