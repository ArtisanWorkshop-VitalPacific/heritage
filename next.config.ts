import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Parallel local dev servers set NEXT_DIST_DIR so they do not share a build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // The Susan page became Our Story. Old links still land on it.
  redirects() {
    return [{ source: "/susan", destination: "/our-story", permanent: true }];
  },
};

export default nextConfig;
