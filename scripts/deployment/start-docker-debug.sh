#!/bin/bash

# Quick Docker Debug Script for ITP Issues
# This script helps you quickly test the complete ITP workflow in Docker

set -e

echo "🚀 SiteProof v2 - Quick Docker Debug for ITP Issues"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "\n${BLUE}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Check prerequisites
print_step "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found"
    echo "Please create .env.local with your Supabase credentials:"
    echo "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "SUPABASE_SERVICE_KEY=your-service-key"
    exit 1
fi

print_success "Prerequisites check passed"

# Step 2: Clean up any existing containers
print_step "Cleaning up existing containers..."
docker-compose down --remove-orphans &> /dev/null || true
print_success "Cleanup completed"

# Step 3: Build and start services
print_step "Building and starting services..."
echo "This may take a few minutes on first run..."

docker-compose up -d redis
sleep 3

docker-compose up -d web
print_success "Services started"

# Step 4: Wait for services to be ready
print_step "Waiting for services to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -sf http://localhost:3000/api/health &> /dev/null; then
        print_success "Application is ready!"
        break
    fi
    
    echo -n "."
    sleep 5
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Application failed to start properly"
    echo "Checking logs..."
    docker-compose logs web --tail=20
    exit 1
fi

# Step 5: Test critical endpoints
print_step "Testing critical endpoints..."

# Health check
if curl -sf http://localhost:3000/api/health &> /dev/null; then
    print_success "Health endpoint working"
else
    print_error "Health endpoint failed"
fi

# Templates endpoint
response=$(curl -s -w "%{http_code}" http://localhost:3000/api/itp/templates)
http_code=${response: -3}
if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
    print_success "ITP templates endpoint responding"
else
    print_error "ITP templates endpoint failed (HTTP $http_code)"
fi

# Step 6: Show debugging information
print_step "Showing debugging information..."

echo "Container Status:"
docker-compose ps

echo -e "\nEnvironment Check:"
container_id=$(docker-compose ps -q web)
docker exec $container_id sh -c 'echo "SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL" && echo "Has Service Key: $([ -n "$SUPABASE_SERVICE_KEY" ] && echo "YES" || echo "NO")"' 2>/dev/null || echo "Could not check environment"

echo -e "\nAPI Routes Check:"
docker exec $container_id find /app/apps/web/.next/server/app/api -name "route.js" | grep -E "(itp|projects.*lots)" | head -5 2>/dev/null || echo "Routes check failed"

# Step 7: Show next steps
echo -e "\n🎯 ${GREEN}Next Steps:${NC}"
echo "1. Open your browser: http://localhost:3000"
echo "2. Log in with your Supabase credentials"
echo "3. Navigate to: Projects → Select a project → Select a lot"
echo "4. Test ITP functionality and check browser console for errors"

echo -e "\n🔧 ${BLUE}Debugging Commands:${NC}"
echo "View logs:           docker-compose logs -f web"
echo "Debug APIs:          ./docker-test.sh debug"
echo "Stop services:       docker-compose down"
echo "Full test suite:     ./docker-test.sh"

echo -e "\n🐛 ${YELLOW}If you see 500 errors:${NC}"
echo "1. Check browser console (F12)"
echo "2. Check container logs: docker-compose logs web"
echo "3. Run full debug: ./docker-test.sh debug"
echo "4. See DEBUG_ITP_ISSUES.md for detailed troubleshooting"

echo -e "\n${GREEN}🚀 Application is ready for testing!${NC}"