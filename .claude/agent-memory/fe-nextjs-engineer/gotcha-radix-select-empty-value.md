---
name: gotcha-radix-select-empty-value
description: Radix Select (radix-ui ≥1.6) throws at render if any <SelectItem value=""> — must use a sentinel for the "all/clear" option
metadata:
  type: feedback
---

`<SelectItem value="">` crashes Radix Select on render: *"A <Select.Item /> must
have a value prop that is not an empty string."* radix-ui bumped to ^1.6 (US-E11.3)
enforces this; the empty string is reserved for clearing the Select to show the placeholder.

**Why:** the older `value=""` "All subjects/statuses" filter idiom (still present in
some feature filter-bars e.g. lesson-bank) renders fine in app runtime sometimes but
HARD-FAILS in the Storybook interaction runner (chromium) and any fresh render under
radix ≥1.6.

**How to apply:** for an "All / clear" Select option use a sentinel string
(`const ALL = "__all__"`), bind `value={filterVal ?? ALL}`, and map back in onValueChange:
`onValueChange={(v) => onChange({ x: v === ALL ? undefined : v })}`. Never emit
`<SelectItem value="">`. This surfaced because the Storybook vitest runner now works
(it renders the Select eagerly) — see [[gotcha-storybook-vitest-runner-broken]].
