/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@siteproof/database', '@siteproof/design-system', '@siteproof/config'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig