#!/bin/bash

echo "🔍 Testing new features visibility..."
echo ""

# Test API endpoints
echo "📡 Testing API endpoints:"
echo -n "  /api/notifications/vapid-public-key: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/notifications/vapid-public-key
echo ""

echo -n "  /api/dashboard/layout: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/dashboard/layout
echo ""

echo -n "  /api/dashboard/widgets/project-summary: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/dashboard/widgets/project-summary
echo ""

# Check if components are in the bundle
echo ""
echo "📦 Checking if components are in the build:"
echo -n "  PhotoUpload component: "
if ls .next/static/chunks/app/**/*.js 2>/dev/null | xargs grep -l "PhotoUpload" 2>/dev/null | head -1 > /dev/null; then
  echo "✅ Found in build"
else
  echo "❌ Not found"
fi

echo -n "  DashboardWidgets component: "
if ls .next/static/chunks/app/**/*.js 2>/dev/null | xargs grep -l "DashboardWidget" 2>/dev/null | head -1 > /dev/null; then
  echo "✅ Found in build"
else
  echo "❌ Not found"
fi

echo -n "  dark-mode CSS: "
if [ -f "src/styles/dark-mode.css" ]; then
  echo "✅ File exists"
else
  echo "❌ Not found"
fi

echo ""
echo "🎯 Where to see the features:"
echo "  📸 Photo Upload: Go to /dashboard/projects/[id]/lots/[lotId]/itp/[itpId]"
echo "     - Click on any ITP item"
echo "     - Look for the Camera button"
echo ""
echo "  🌙 Dark Mode: Component exists but needs to be added to layout"
echo "  📊 Dashboard Widgets: Component exists but needs to be added to dashboard page"
echo "  ✍️ Signature Capture: Component exists but needs to be integrated"
echo "  🔔 Notifications: Settings component exists but needs to be added to settings page"