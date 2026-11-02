import type { NextConfig } from "next";

// 開発時は /、静的出力はGitHub Pagesの /nmrlink/ に配置します。
// 別の場所へ配信する場合は、ビルド時に NEXT_PUBLIC_BASE_PATH を指定します。
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === "production" ? "/nmrlink" : "")).replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
  allowedDevOrigins: ["mair.local"],
  experimental: { agentFeedback: true },
  // public配下のindex.htmlはnext devでは自動補完されないため補います。
  ...(process.env.NODE_ENV !== "production" ? {
    async rewrites() {
      return [{ source: "/storybook/", destination: "/storybook/index.html" }];
    },
  } : {}),
  // 静的配信ではサーバー側のキャッシュ・ストリーミングを使いません。
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
