# FE QA Playwright — Memory Index

- [Storybook test import pattern](storybook-import-pattern.md) — use `storybook/test`, not `@storybook/test`
- [Storybook runner env issue](storybook-runner-env-issue.md) — local Storybook browser runner fails with ESM/CJS error on vite-tsconfig-paths
- [Story play gap pattern](story-play-gap-pattern.md) — Default/AllStats stories often miss AC-4/AC-5/AC-6 detail; always check annotation text + trend label + session keys
- [US-E13.5 QA patterns](us-e13.5-qa-patterns.md) — principal teachers screen: error state story always missing; AssignmentSheet_Open play does not assert GVCN pre-select; overflow badge (+N) not covered in fixture data
- [US-E09.1 QA patterns](us-e09.1-qa-patterns.md) — discipline screen: notifyParent toggle not exercised in play(); ConductTab_Empty story missing; AC-9 student-route guard untested; Loading story weak assertion
- [US-E09.3 QA patterns](us-e09.3-qa-patterns.md) — staff leave: failure type split (missing-reject-reason + reason-too-short vs spec's single missing-reason); 7 stories not 8; dates stored as DD/MM/YYYY not ISO; custom toast not sonner
