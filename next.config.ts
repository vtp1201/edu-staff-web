import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Optional: Exclude stories from production build
  ...(process.env.NODE_ENV === "production" && {
    webpack: (config) => {
      config.module.rules.push({
        test: /\.stories\.(tsx|ts|js|jsx)$/,
        use: "ignore-loader",
      });
      return config;
    },
  }),
};

export default nextConfig;
