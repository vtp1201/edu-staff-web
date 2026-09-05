---
name: embed-allowlist-review
description: How to verify an iframe/embed URL allowlist in this repo, and what React 19 does/doesn't block in href — reusable checklist for any BE-sourced-URL render
metadata:
  type: project
---

`src/features/lms/presentation/course-player/embed-source.ts` (US-E24.5) is the
reference implementation for rendering a BE/teacher-supplied URL. Reuse it as the
bar for any future embed surface.

The four gates it applies, in order: `new URL()` parses (else null) → `protocol === 'https:'`
→ `username`/`password` both empty (kills `https://youtube.com:443@attacker.com`) →
`ALLOWED_HOSTS.has(parsed.hostname)` **exact Set equality**, never `endsWith`/`includes`.
It then REBUILDS the src from `origin + rewritten pathname`, dropping query/fragment,
so nothing a teacher pasted rides into the attribute.

**Verified empirically, do not re-derive:**
- 48 independent bypass shapes all return null: prefix/suffix domains, path-hiding,
  userinfo, IDN homograph (Cyrillic е/о punycode to `xn--` ⇒ miss the Set), trailing-dot
  host, protocol-relative, `data:`/`vbscript:`/`javascript:`, whitespace-injected.
- `new URL()` percent-encodes `"`, `<`, `>`, space in `pathname`; it does NOT encode `'`.
  A surviving `'` is harmless (React escapes JSX attribute values) — do not flag it.
- **React 19 blocks `javascript:` in `href` itself**, replacing it with a throwing stub,
  including case variants and leading whitespace. It does NOT block `data:` or `vbscript:`.
  So an unvalidated BE URL in `href` is a defense-in-depth gap, not an XSS blocker.

**How to verify rather than trust:** write your own bypass table as a temp
`__tests__/zz-*.test.ts` in the branch, run it, then delete it. Trusting the shipped
allowlist test is not sufficient for a high-risk lane.

See [[review-checks-denorm-removal]] for the parallel "prove the negative" habit.
