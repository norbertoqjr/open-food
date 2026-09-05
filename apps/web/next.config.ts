import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL('https://images.openfoodfacts.org/**'),
      // Placeholder portraits for the demo user's avatar. The id-based route
      // is used rather than the ?username= one precisely because it carries no
      // query string: remotePatterns matches `search` exactly, so a name-keyed
      // URL would have to be pinned here and would 400 the moment it changed.
      new URL('https://avatarapi.runflare.run/public/**'),
    ],
  },
};

export default nextConfig;
