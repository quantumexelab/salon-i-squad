import type { NextConfig } from "next";

// Default Workbox runtime caching (offline / home-screen friendly).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const runtimeCaching = require("next-pwa/cache");

// next-pwa generates service worker files into /public on production builds.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Keep SW off in local `next dev` to avoid stale cache while coding.
  disable: process.env.NODE_ENV === "development",
  // Do not precache the FCM worker (registered separately by Firebase Messaging).
  exclude: [/firebase-messaging-sw\.js$/],
  runtimeCaching,
});

const nextConfig: NextConfig = {
  // next-pwa relies on webpack; keep turbopack config for Next 16 compatibility.
  turbopack: {},
};

export default withPWA(nextConfig);
