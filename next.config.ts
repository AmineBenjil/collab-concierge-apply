import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /* the licensed headline font isn't in the repo: local files in public/fonts win, otherwise benable.com serves it */
  async rewrites() {
    return [{ source: "/fonts/:file", destination: "https://benable.com/fonts/National2Narrow/:file" }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
