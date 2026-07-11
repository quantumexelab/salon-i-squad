import type { NextConfig } from "next";

// next-pwa generates service worker files into /public on production builds.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Keep SW off in local `next dev` to avoid stale cache while coding.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // next-pwa relies on webpack; keep turbopack config for Next 16 compatibility.
  turbopack: {},
};

export default withPWA(nextConfig);
