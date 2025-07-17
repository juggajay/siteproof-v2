/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@siteproof/database', '@siteproof/design-system', '@siteproof/config'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Enable standalone output for Docker
  output: 'standalone',
}

export default nextConfig