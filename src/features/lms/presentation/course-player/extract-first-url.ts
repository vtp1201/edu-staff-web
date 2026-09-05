/**
 * Finds the first `https://` link mentioned in a PLAIN-TEXT lesson body (D4).
 *
 * This is a convenience, NOT a security control: whatever it returns is fed to
 * `embedSourceFor`, which is the only thing that decides whether a URL may
 * become an `iframe src`. It therefore returns non-allowlisted URLs verbatim
 * rather than pre-filtering (one gate, in one place, is easier to prove right
 * than two half-gates).
 *
 * `http://` is skipped because `embedSourceFor` rejects it anyway — matching it
 * here would only produce a candidate that can never resolve.
 */

/** Stops at whitespace and at the characters that end a URL in prose. */
const HTTPS_URL = /https:\/\/[^\s<>"'`)\]}]+/;

/** Trailing sentence punctuation is prose, not part of the link. */
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

export function extractFirstUrl(text: string): string | null {
  const match = HTTPS_URL.exec(text);
  if (match === null) return null;
  const candidate = match[0].replace(TRAILING_PUNCTUATION, "");
  return candidate.length > "https://".length ? candidate : null;
}
