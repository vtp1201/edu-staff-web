/**
 * Scheme gate for OUTBOUND links (US-E24.5 review, defence in depth).
 *
 * `url` / `examUrl` are teacher-authored strings that reach an `<a href>`.
 * React 19 already refuses to render a `javascript:` href, but that is one
 * framework version's behaviour, not our contract — so every anchor in the
 * player asks here first and simply does not render when the answer is `no`.
 *
 * Same shape as `embed-source.ts`, one notch looser: an embed must be `https:`
 * (it runs INSIDE our chrome), while a link the student navigates away to may
 * also be plain `http:` — school material is still hosted on http hosts, and
 * refusing it would hide real content rather than protect anyone.
 *
 * Anything `new URL()` cannot parse (free text, a bare `drive.google.com`, a
 * protocol-relative `//host/x`) is rejected: we never guess a scheme.
 */
export function isSafeHref(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** The link's host, for a meta line. Unparseable → `null` (never the raw
 *  string, which could be a whole sentence a teacher typed). */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
