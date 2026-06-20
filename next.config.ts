import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/bootstrap/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
};

if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_USE_MOCK === "true"
) {
  throw new Error(
    "NEXT_PUBLIC_USE_MOCK=true in a production build — mock mode grants admin to any token (jwt.ts). Unset it.",
  );
}

export default withNextIntl(nextConfig);
