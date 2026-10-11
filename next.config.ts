import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pills and demo data are read from disk at request time (lib/pills/load.ts, lib/data),
  // via paths the bundler cannot trace — ship them with every server route.
  outputFileTracingIncludes: {
    '/**': ['./pills/**/*', './data/**/*'],
  },
};

export default nextConfig;
