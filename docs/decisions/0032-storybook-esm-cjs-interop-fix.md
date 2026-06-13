# 0032 Fix Storybook interaction runner: bun patch + postcss CJS (ESM/CJS interop)

Date: 2026-06-13

## Status

Accepted

## Context

`@storybook/nextjs-vite@10.4.2` ships `dist/preset.js` (an ES module) that uses
`createRequire(import.meta.url)("vite-plugin-storybook-nextjs")` at module-init time (line ~1947).
This forces Node.js to load the CJS entry (`dist/index.cjs`) of `vite-plugin-storybook-nextjs`.
That CJS build synchronously `require()`s both `vite-tsconfig-paths` (v5.x, ESM-only) and `vite`
itself (v8.x, also ESM-only). Node.js 20 throws `ERR_REQUIRE_ESM` for any ESM module loaded via
`require()`.

A second separate issue: the bundled `postcss-load-config` inside `@storybook/nextjs-vite`'s
`preset.js` loads the project's `postcss.config.mjs` via `require()` — but `.mjs` files are
always treated as ESM, so that also throws `ERR_REQUIRE_ESM`.

The full chain that blocked ALL Storybook `play()` interaction tests env-wide:
1. `bun run vitest:storybook` → `@storybook/addon-vitest/vitest-plugin` → `loadStorybook()`
2. `@storybook/nextjs-vite/dist/preset.js` line ~1947: `require3("vite-plugin-storybook-nextjs")`
   → loads `.cjs` → `require("vite-tsconfig-paths")` (ESM-only v5.x) → `ERR_REQUIRE_ESM`
3. (if fixed above) same `preset.js` calls `normalizePostCssConfig()` → bundled
   `postcss-load-config` → `require("postcss.config.mjs")` → `ERR_REQUIRE_ESM`

## Decision

Two targeted fixes:

### Fix 1: bun patch `@storybook/nextjs-vite@10.4.2`

Patch `dist/preset.js` to remove the synchronous `require3("vite-plugin-storybook-nextjs")` from
module-init time and replace it with a dynamic `import()` inside the `async viteFinal()` function:

```diff
-var require3 = createRequire3(import.meta.url), vitePluginStorybookNextjs = require3("vite-plugin-storybook-nextjs"), core = {
+// NOTE (patch 0032): removed synchronous require3(...) — vite@8+ and vite-tsconfig-paths@5+
+// are ESM-only, so require() throws ERR_REQUIRE_ESM.
+// Load the plugin via dynamic import() inside the async viteFinal instead.
+var core = {
...
 viteFinal = async (config2, options) => {
+  const { default: vitePluginStorybookNextjs } = await import("vite-plugin-storybook-nextjs");
```

The patch is committed via `bun patch --commit` and stored in `patches/@storybook%2Fnextjs-vite@10.4.2.patch`.
It is automatically re-applied on every `bun install`.

### Fix 2: Convert `postcss.config.mjs` → `postcss.config.js` (CJS)

Rename the PostCSS config from `.mjs` (ESM) to `.js` (CJS, since the project has no
`"type": "module"` in `package.json`) and convert from `export default` to `module.exports`.
This allows the bundled `postcss-load-config` in Storybook's preset to `require()` it.

## Alternatives Considered

1. **Upgrade Node to v23.6+** (where `require(esm)` is stable) — invasive environment change,
   not in scope.
2. **Downgrade vite to a CJS version** — there is no CJS version; vite has been ESM-only since v5.
3. **Patch `vite-plugin-storybook-nextjs/dist/index.cjs`** — still can't `require("vite")` since
   vite is also ESM-only; the root problem is in `@storybook/nextjs-vite/dist/preset.js`.
4. **Wait for upstream fix** — no timeline; blocks all interaction tests indefinitely.
5. **Keep `postcss.config.mjs`** — would require a second patch for the bundled
   postcss-load-config; converting to CJS `.js` is simpler and more portable.

## Consequences

Positive:

- Storybook `play()` interaction tests run without `ERR_REQUIRE_ESM`.
- 110/110 interaction stories pass (44 files); E2E/interaction proof tier restored env-wide.
- `bun patch` ensures the fix survives `bun install` automatically.
- Minimal change: one patch file + one config file conversion.

Tradeoffs:

- The patch is tied to `@storybook/nextjs-vite@10.4.2`. When upgrading Storybook, the patch
  must be reviewed (may be needed for the new version, or the upstream may have fixed it).
- `postcss.config.js` uses `module.exports` instead of ESM `export default` — CJS style is
  slightly less idiomatic in a modern toolchain, but functionally identical and widely supported.

## Follow-Up

- When `@storybook/nextjs-vite` is upgraded, check if the fix is merged upstream and remove the
  patch if so.
- Monitor `vite-plugin-storybook-nextjs` for a native ESM fix (they could publish
  their own dynamic-import version that doesn't need this patch).
- Story: `INFRA-storybook-test-runner`.
