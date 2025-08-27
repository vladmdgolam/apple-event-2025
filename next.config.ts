import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Support shader files with raw-loader
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader"],
    })

    return config
  },
};

export default nextConfig;
