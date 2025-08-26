/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure public files are properly served
  publicRuntimeConfig: {
    staticFolder: '/public',
  },
  // Add headers for static files
  async headers() {
    return [
      {
        source: '/(favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
