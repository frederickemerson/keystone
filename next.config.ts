import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@tencent-ai/agent-sdk'],

  // Pills and demo data are read from disk at request time (lib/pills/load.ts, lib/data),
  // via paths the bundler cannot trace — ship them with every server route.
  outputFileTracingIncludes: {
    '/**': ['./pills/**/*', './data/**/*'],
    '/api/llm/*': [
      './node_modules/@tencent-ai/agent-sdk/cli/bin/**/*',
      './node_modules/@tencent-ai/agent-sdk/cli/*.json',
      './node_modules/@tencent-ai/agent-sdk/cli/dist/codebuddy-headless.js',
      './node_modules/@tencent-ai/agent-sdk/cli/dist/lazy-headless/**/*',
    ],
  },
};

export default nextConfig;
