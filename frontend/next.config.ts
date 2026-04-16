import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16+ blocks dev-only WebSockets (e.g. /_next/webpack-hmr) from "other" hostnames.
  // If you open http://127.0.0.1:3000 but started `next dev` on localhost (or the reverse), HMR fails without this.
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.local"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "https",
        hostname: "media.giphy.com",
      },
      {
        protocol: "https",
        hostname: "i.ebayimg.com",
      },
    ],
  },
};

export default nextConfig;
