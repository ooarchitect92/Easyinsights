import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
const directory = path.dirname(fileURLToPath(import.meta.url));
const headers = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];
const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(directory, '../..'),
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['mongodb', 'ioredis', 'kafkajs'],
  async headers() {
    return [{ source: '/:path*', headers }];
  },
};
export default config;
