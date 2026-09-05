/**
 * The iframe allowlist — the ONE security gate of the course player (US-E24.5,
 * high-risk lane).
 *
 * `content` / `url` / `examUrl` all come from BE, i.e. from whatever a teacher
 * typed. An `<iframe src>` pointing at an attacker-chosen origin is a live
 * clickjacking/phishing surface inside our own chrome, so a URL only becomes an
 * embed when it is:
 *
 *   1. parseable by `new URL()` (anything else — `javascript:`, `//host/x`,
 *      free text — throws and yields `null`; we never guess a scheme);
 *   2. `https:` (an http embed would also be blocked as mixed content, but the
 *      point is that we refuse it before the browser has to);
 *   3. carrying NO userinfo (`https://evil@drive.google.com/...` reads as a
 *      hostile origin to a human even though the browser resolves it to Drive);
 *   4. an EXACT `hostname` match against the Set below.
 *
 * (4) is why this is a `Set.has(hostname)` and never `endsWith`/`includes`:
 * `youtube.com.evil.com` ends the allowlist name in the middle of a hostile
 * domain and `evil.com/youtube.com` hides it in the path. Only the parsed
 * `hostname` is ever compared, and only for equality.
 *
 * The returned `embedUrl` is REBUILT from parsed components (origin + a
 * rewritten path), never the caller's string echoed back — so a query/fragment
 * a teacher pasted cannot ride along into the `src`.
 *
 * Pure module: zero React, zero DOM. Unit-tested exhaustively in
 * `__tests__/embed-source.test.ts` including every bypass shape above.
 */

const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "drive.google.com",
  "docs.google.com",
  "geogebra.org",
  "www.geogebra.org",
]);

export interface EmbedSource {
  /** The matched allowlist hostname — the thing that made this safe. */
  origin: string;
  /** Rewritten, safe-to-render-as-`iframe src` URL. */
  embedUrl: string;
}

/** `abc123` from a YouTube id-bearing URL, or null. Ids are restricted to the
 *  characters YouTube actually uses, so nothing else can be smuggled in. */
const YOUTUBE_ID = /^[\w-]{1,64}$/;

function youtubeEmbed(url: URL): string | null {
  const id =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.pathname === "/watch"
        ? (url.searchParams.get("v") ?? "")
        : url.pathname.startsWith("/embed/")
          ? url.pathname.slice("/embed/".length)
          : "";
  if (!YOUTUBE_ID.test(id)) return null;
  return `https://www.youtube.com/embed/${id}`;
}

/** Drive/Docs render an embeddable copy at `/preview`. */
function googleEmbed(url: URL): string {
  const path = url.pathname.replace(/\/(edit|view|preview)\/?$/, "/preview");
  return `${url.origin}${path}`;
}

export function embedSourceFor(url: string): EmbedSource | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Unparseable (free text, protocol-relative, a bare host) — never guessed.
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username !== "" || parsed.password !== "") return null;

  const host = parsed.hostname;
  if (!ALLOWED_HOSTS.has(host)) return null;

  if (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "youtu.be"
  ) {
    const embedUrl = youtubeEmbed(parsed);
    return embedUrl === null ? null : { origin: host, embedUrl };
  }

  if (host === "drive.google.com" || host === "docs.google.com") {
    return { origin: host, embedUrl: googleEmbed(parsed) };
  }

  // GeoGebra: the material URL is itself embeddable. Rebuilt from origin +
  // pathname so query/hash are dropped like everywhere else.
  return { origin: host, embedUrl: `${parsed.origin}${parsed.pathname}` };
}
