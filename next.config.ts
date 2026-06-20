import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/bootstrap/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
};

// Mock mode (NEXT_PUBLIC_USE_MOCK) inlines a dev-only auth bypass — jwt.ts grants
// admin to any token. It must never reach a DEPLOYED build. `next build` always sets
// NODE_ENV=production (including the local pre-push verification build), so NODE_ENV
// cannot tell a deploy from a local build. Gate on an explicit deploy/CI signal:
// CI is set by GitHub Actions / Vercel / most runners; local lefthook pre-push is not.
const isDeployBuild =
  process.env.CI === "true" ||
  process.env.VERCEL === "1" ||
  process.env.DEPLOY_ENV === "production";

if (isDeployBuild && process.env.NEXT_PUBLIC_USE_MOCK === "true") {
  throw new Error(
    "NEXT_PUBLIC_USE_MOCK=true in a deploy build — mock mode grants admin to any token (jwt.ts). Unset it before deploying.",
  );
}

export default withNextIntl(nextConfig);
