---
name: adminsetup-namespace
description: "adminSetup" in DR briefs maps to the real namespace "adminSchoolSetup" in vi.json/en.json
metadata:
  type: feedback
---

DR briefs (including DR-011) refer to `adminSetup.setupGuideTitle`, `adminSetup.stepGradeLevels`, etc. The actual namespace in `src/bootstrap/i18n/messages/{vi,en}.json` is `adminSchoolSetup`. The step labels live under `adminSchoolSetup.steps.*` and the guide title under `adminSchoolSetup.guide.setupGuideTitle`.

**Why:** The brief writer used a shorthand name that doesn't match the JSON key.

**How to apply:** When a brief says `adminSetup.*`, grep vi.json for the actual key path before writing — always use `adminSchoolSetup` as the namespace in the JSON files.
