#!/bin/bash

# Vercel deployment script to force Next.js framework detection
echo "🚀 Preparing Vercel deployment..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Create a temporary next.config.js if it doesn't exist
if [ ! -f "next.config.js" ]; then
  echo "/** @type {import('next').NextConfig} */" > next.config.js
  echo "const nextConfig = {" >> next.config.js
  echo "  reactStrictMode: true," >> next.config.js
  echo "  poweredByHeader: false," >> next.config.js
  echo "  compress: true," >> next.config.js
  echo "  productionBrowserSourceMaps: false," >> next.config.js
  echo "  experimental: {" >> next.config.js
  echo "    optimizeCss: false" >> next.config.js
  echo "  }" >> next.config.js
  echo "};" >> next.config.js
  echo "" >> next.config.js
  echo "module.exports = nextConfig;" >> next.config.js
  echo "✅ Created next.config.js"
fi

# Ensure pages directory exists (even if empty) for framework detection
mkdir -p pages
touch pages/.gitkeep
echo "✅ Ensured pages directory exists"

# Create app directory marker
mkdir -p app
touch app/.gitkeep
echo "✅ Ensured app directory exists"

# Update vercel.json with more explicit settings
cat > vercel.json << 'EOF'
{
  "name": "siteproof-web",
  "version": 2,
  "framework": "nextjs",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "outputDirectory": ".next",
  "public": false,
  "github": {
    "enabled": true,
    "autoAlias": true
  },
  "functions": {
    "app/**/*.{js,jsx,ts,tsx}": {
      "runtime": "nodejs20.x"
    },
    "pages/api/**/*.{js,ts}": {
      "runtime": "nodejs20.x"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
EOF
echo "✅ Updated vercel.json with explicit Next.js configuration"

# Create a .vercelignore file
cat > .vercelignore << 'EOF'
node_modules
.next
.turbo
coverage
.env*.local
*.log
.DS_Store
dist
build
EOF
echo "✅ Created .vercelignore"

# Update package.json to ensure Next.js is properly detected
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Ensure scripts are correct
pkg.scripts = {
  ...pkg.scripts,
  'dev': 'next dev',
  'build': 'next build',
  'start': 'next start',
  'lint': 'next lint'
};

// Ensure Next.js is in dependencies
if (!pkg.dependencies.next) {
  console.error('⚠️  Warning: next is not in dependencies!');
}

// Add engines if missing
if (!pkg.engines) {
  pkg.engines = { node: '>=18.17.0' };
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Updated package.json');
"

echo ""
echo "🎯 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Commit these changes: git add -A && git commit -m 'Force Next.js framework detection'"
echo "2. Push to trigger deployment: git push"
echo "3. In Vercel dashboard:"
echo "   - Go to Project Settings > General"
echo "   - Scroll to 'Root Directory'"
echo "   - Ensure it's set to: apps/web"
echo "   - Under 'Framework Preset', manually select 'Next.js'"
echo "   - Click 'Save'"
echo ""
echo "If the issue persists, try:"
echo "- Creating a new Vercel project"
echo "- Using Vercel CLI: vercel --prod --force"