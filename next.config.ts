import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/bootstrap/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
};

export default withNextIntl(nextConfig);
