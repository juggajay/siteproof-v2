/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable build cache to ensure fresh Tailwind CSS generation
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // Add headers for favicon files only
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
    ];
  },
};

module.exports = nextConfig;
