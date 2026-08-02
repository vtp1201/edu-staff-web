---
name: pattern-unmock-anticipatory-dto
description: Un-mocking a feature whose DTO was written "in anticipation" — a mock-fed DTO is never wire-validated, so re-verify the ENUM CASING; and delete an honest-degrade repo whose premise turned out false
metadata:
  type: project
---

Confirmed on US-E18.34 (parent child-attendance, un-mocking US-E20.5).

**A DTO only a MOCK ever produces has never been validated against the wire.**
US-E20.5 wrote its DTO "contract-correct in anticipation of the un-mock" and
said so in the doc comment. The FIELD NAMES were right; the **status enum
casing was not** — it typed `status` with the DOMAIN union
(`present|late|…`) while the wire is UPPER_SNAKE (`PRESENT|LATE|…`), and the
mapper passed it through. Completely invisible, because the mock fixture
generator emitted domain-cased values, so DTO → mapper → entity round-tripped
"green" through a type that was wrong at both ends. First real response would
have produced `undefined` tone lookups in the UI.

**How to apply:** when a packet says "the DTO is already contract-correct, the
diff is small" — treat that as a claim to disprove, and check the ENUMS
specifically (field names are what people get right). Ask: did anything other
than the mock ever produce this DTO? If no, it is unverified. Fix by re-casting
the MOCK FIXTURES to the wire vocabulary too, so mock and real are proven by
the same mapper — otherwise the mock silently stops exercising it.

**Reuse the existing wire↔domain table, don't declare a second one.** The
sibling feature (`features/attendance`) already owned `WireAttendanceStatus` +
`mapStatusFromWire`. Cross-feature *infrastructure* import is fine and has
precedent (`tenant.repository.ts` imports `features/auth`'s mapper) — a second
4-line lookup table is a drift source, not self-containment.

**Delete an honest-degrade repo when its PREMISE was false** (not merely when
the BE catches up). `UnavailableChildAttendanceRepository` existed because the
openapi summary said PARENT was not in the ACL; the Go `authorize()` had
allowed a linked PARENT since US-047. Keeping it "as a fallback" would mean a
client-side hard-coded 403 shadowing the BE's real answer — the same
lying-green class it was written to prevent. Also re-read the i18n copy: the
failure key survives but its MEANING changes ("feature not enabled yet" → "you
are not linked to this student"), and no test catches stale copy because the
stories assert `getByRole("alert")`, not text.

**`vi.resetModules()` + `isApiError` (an `instanceof` check) = silent
mis-mapping.** A top-level `import { ApiError }` in a DI env-matrix test is a
DIFFERENT class identity from the fresh copy the repository got, so
`errorCodeOf` returns undefined and every code branch degrades to the `unknown`
fallback — the test fails with a plausible-looking wrong failure type, not an
import error. Construct the error via `await import(...)` INSIDE the stub, at
throw time.

Baselines after this story: **471 files / 3460 vitest**, **157 files / 1199
Storybook**. Pre-push failed once and passed on an immediate re-run with zero
changes (again — see [[pattern-force-mock-vs-honest-degrade]]).
