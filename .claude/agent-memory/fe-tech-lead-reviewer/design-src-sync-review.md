---
name: design-src-sync-review
description: Reviewing a design_src/ mockup-bundle sync — EduPortal.html is gitignored, and how to prove a "comment-only" tokens.js diff
metadata:
  type: reference
---

# Reviewing a `design_src/` bundle sync (docs-only lane)

**`design_src/EduPortal.html` is gitignored repo-wide** — `.gitignore:68`. An engineer
who says "I copied EduPortal.html" will show it absent from `git diff --stat`. That is
CORRECT, not an omission. Verify with `git check-ignore -v design_src/EduPortal.html`
plus `git diff main...HEAD -- .gitignore` (empty = the rule is pre-existing, not newly
added to hide the file). Inspect the on-disk file for the expected `<script>` tags.

**Proving a "comment-only" diff** (recurs for `design_src/edu/tokens.js`, whose comments
carry decision provenance `0040`/`0027`/`0046`/`0013` the designer bundle overwrites):

```bash
diff <(sed 's,//.*,,' ~/Downloads/<bundle>/edu/tokens.js) <(sed 's,//.*,,' design_src/edu/tokens.js)
```

Residual trailing-whitespace-only hunks = values byte-identical. Keeping the repo file
is the right call — a blind full-bundle copy silently reverts decision annotations.

**`docs/product/design-spec.jsonc` is JSONC** — strip `//` comments outside strings, then
`json.loads`. Real screen entries live under the top-level `screens` key.
`--muted-foreground` is NOT in `src/app/tokens.css`; it is a shadcn semantic var in
`src/app/globals.css` aliased to `--edu-text-secondary` — do not flag it as a missing token.

Spot-check that spec "normative values" are read out of the jsx, not invented: grep the
literal (`minmax(0,1.7fr)`, `maxHeight: 520`, `width: 460`) in the cited source file.

See also [[conventions]], [[recurring-violations]].
