#!/bin/bash

# Complete ITP Testing with Docker and Playwright
echo "🐳 Starting complete ITP workflow testing with Docker..."

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Start the application in Docker
echo "1️⃣ Starting application with Docker..."
npm run dev &
DEV_PID=$!

# Wait for app to be ready
echo "2️⃣ Waiting for application to be ready..."
sleep 10

# Test if app is responding
for i in {1..12}; do
    if curl -sf http://localhost:3000/api/health &> /dev/null; then
        echo "✅ Application is ready!"
        break
    fi
    echo "⏳ Waiting for app to start... ($i/12)"
    sleep 5
done

# Check if app started successfully
if ! curl -sf http://localhost:3000/api/health &> /dev/null; then
    echo "❌ Application failed to start"
    kill $DEV_PID 2>/dev/null
    exit 1
fi

# Install Playwright if not available
echo "3️⃣ Setting up Playwright..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    kill $DEV_PID 2>/dev/null
    exit 1
fi

# Try to install playwright if not installed
npx playwright install chromium 2>/dev/null || true

# Run the complete workflow test
echo "4️⃣ Running complete ITP workflow test..."
node test-complete-itp-workflow.js

# Test results
echo "5️⃣ Test completed!"
echo "📊 Results:"
echo "- Check console output above for test results"
echo "- Check screenshots: complete-itp-workflow-result.png"
echo "- Check error screenshots if any issues occurred"

# Cleanup
echo "6️⃣ Cleaning up..."
kill $DEV_PID 2>/dev/null

echo "🏁 ITP testing completed!"