---
name: storybook-import-pattern
description: Correct import specifier for storybook test utilities (expect/userEvent/within) in this repo
metadata:
  type: feedback
---

Use `import { expect, userEvent, within } from "storybook/test"` — bare specifier without `@`.

**Why:** The project uses Storybook 10 where `storybook/test` is the bare specifier; `@storybook/test` is not installed and causes a TS2307 type error.

**How to apply:** Always use `storybook/test` in every `*.stories.tsx` play() function that needs test utilities.
