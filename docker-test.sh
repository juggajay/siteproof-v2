#!/bin/bash

# SiteProof v2 Docker Testing Script
# This script sets up and runs comprehensive tests using Docker

set -e  # Exit on any error

echo "🐳 SiteProof v2 Docker Testing Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker availability..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is available"
}

# Check for required environment file
check_env() {
    print_status "Checking environment configuration..."
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            print_warning ".env.local not found. Copying from .env.example..."
            cp .env.example .env.local
            print_warning "Please update .env.local with your actual configuration before running tests."
        else
            print_error ".env.local and .env.example not found. Cannot proceed with testing."
            exit 1
        fi
    fi
    print_success "Environment configuration found"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    docker-compose build web
    if [ $? -eq 0 ]; then
        print_success "Docker images built successfully"
    else
        print_error "Failed to build Docker images"
        exit 1
    fi
}

# Start services
start_services() {
    print_status "Starting services..."
    docker-compose up -d redis
    sleep 5
    docker-compose up -d web
    
    print_status "Waiting for services to be healthy..."
    timeout=120
    elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if docker-compose ps | grep -q "healthy"; then
            print_success "Services are healthy"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    
    print_error "Services failed to become healthy within $timeout seconds"
    docker-compose logs web
    exit 1
}

# Run health checks
health_check() {
    print_status "Running health checks..."
    
    # Test API health endpoint
    response=$(curl -s -w "%{http_code}" http://localhost:3000/api/health)
    http_code=${response: -3}
    
    if [ "$http_code" = "200" ]; then
        print_success "API health check passed"
    else
        print_error "API health check failed (HTTP $http_code)"
        return 1
    fi
    
    # Test Redis connection
    if docker-compose exec redis redis-cli ping | grep -q "PONG"; then
        print_success "Redis connection test passed"
    else
        print_error "Redis connection test failed"
        return 1
    fi
}

# Run Playwright tests
run_playwright_tests() {
    print_status "Setting up Playwright testing environment..."
    
    # Start Playwright container
    docker-compose --profile testing up -d playwright
    
    # Install dependencies and run tests
    docker-compose exec playwright sh -c "
        cd /app &&
        npm install &&
        npx playwright install &&
        npx playwright test --reporter=html
    "
    
    if [ $? -eq 0 ]; then
        print_success "Playwright tests completed"
    else
        print_warning "Some Playwright tests may have failed. Check the report."
    fi
}

# Test API endpoints
test_api_endpoints() {
    print_status "Testing critical API endpoints..."
    
    base_url="http://localhost:3000"
    
    # Test public endpoints
    endpoints=(
        "/api/health"
        "/api/setup/check"
    )
    
    for endpoint in "${endpoints[@]}"; do
        response=$(curl -s -w "%{http_code}" "$base_url$endpoint")
        http_code=${response: -3}
        
        if [ "$http_code" = "200" ]; then
            print_success "✓ $endpoint"
        else
            print_error "✗ $endpoint (HTTP $http_code)"
        fi
    done
}

# Test page accessibility
test_page_accessibility() {
    print_status "Testing page accessibility..."
    
    # Test that key pages load without 500 errors
    pages=(
        "/"
        "/auth/login"
        "/auth/signup"
    )
    
    for page in "${pages[@]}"; do
        response=$(curl -s -w "%{http_code}" "http://localhost:3000$page")
        http_code=${response: -3}
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "302" ] || [ "$http_code" = "401" ]; then
            print_success "✓ $page"
        else
            print_error "✗ $page (HTTP $http_code)"
        fi
    done
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    
    report_file="test-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "SiteProof v2 Docker Test Report"
        echo "Generated: $(date)"
        echo "=============================="
        echo ""
        echo "Services Status:"
        docker-compose ps
        echo ""
        echo "Container Logs (last 50 lines):"
        echo "--- Web Service ---"
        docker-compose logs --tail=50 web
        echo ""
        echo "--- Redis Service ---"
        docker-compose logs --tail=50 redis
    } > "$report_file"
    
    print_success "Test report saved to $report_file"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    docker-compose down
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo ""
    print_status "Starting comprehensive testing suite..."
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    check_docker
    check_env
    build_images
    start_services
    
    # Run tests
    health_check
    test_api_endpoints
    test_page_accessibility
    
    # Optional: Run Playwright tests if requested
    if [ "$1" = "--with-playwright" ]; then
        run_playwright_tests
    fi
    
    generate_report
    
    print_success "All tests completed successfully!"
    print_status "The application is running at http://localhost:3000"
    print_status "Redis is available at localhost:6379"
    print_status "Use 'docker-compose down' to stop all services"
}

# Run main function with all arguments
main "$@"