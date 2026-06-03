import type { NextConfig } from "next";

/**
 * Next.js Configuration
 *
 * Next.js 16 uses Turbopack by default (faster than Webpack).
 * Turbopack handles Node.js polyfill fallbacks automatically,
 * so we don't need the webpack config we'd normally add for Solana libraries.
 */
const nextConfig: NextConfig = {
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},

  reactStrictMode: true,
};

export default nextConfig;
