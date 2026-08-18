import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // inline the (~10 KiB) stylesheet into the HTML to remove the
    // render-blocking critical request chain (html -> css)
    inlineCss: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
