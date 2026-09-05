import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://images.openfoodfacts.org/**')],
  },
};

export default nextConfig;
