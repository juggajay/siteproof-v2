#!/bin/bash

# Script to run diary persistence tests with Docker

echo "🚀 Starting SiteProof Diary Testing Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to clean up containers
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up existing containers...${NC}"
    docker-compose -f docker-compose.test.yml down -v
}

# Function to setup test database
setup_database() {
    echo -e "${YELLOW}🗄️  Setting up test database...${NC}"
    
    # Start database container
    docker-compose -f docker-compose.test.yml up -d test-db
    
    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    echo "Running database migrations..."
    docker-compose -f docker-compose.test.yml exec test-db psql -U postgres -d siteproof_test -c "
        -- Create required extensions
        CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
        CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";
    "
    
    # Apply the diary field migrations
    docker-compose -f docker-compose.test.yml exec test-db psql -U postgres -d siteproof_test -f /docker-entrypoint-initdb.d/fix_diary_labour_entries.sql
}

# Function to seed test data
seed_test_data() {
    echo -e "${YELLOW}🌱 Seeding test data...${NC}"
    
    docker-compose -f docker-compose.test.yml exec test-db psql -U postgres -d siteproof_test -c "
        -- Create test organization
        INSERT INTO organizations (id, name, slug)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Test Organization', 'test-org')
        ON CONFLICT DO NOTHING;
        
        -- Create test user
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
        VALUES ('00000000-0000-0000-0000-000000000002', 'test@example.com', crypt('Test123!@#', gen_salt('bf')), NOW())
        ON CONFLICT DO NOTHING;
        
        -- Create test project
        INSERT INTO projects (id, organization_id, name, client_name, status)
        VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Test Project', 'Test Client', 'active')
        ON CONFLICT DO NOTHING;
        
        -- Add user to organization
        INSERT INTO organization_members (user_id, organization_id, role)
        VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin')
        ON CONFLICT DO NOTHING;
    "
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running Playwright tests...${NC}"
    
    # Start all services
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 30
    
    # Run Playwright tests
    docker-compose -f docker-compose.test.yml run --rm playwright npx playwright test tests/diary-persistence.spec.ts --reporter=list
    
    # Check test results
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed!${NC}"
    else
        echo -e "${RED}❌ Some tests failed. Check the report for details.${NC}"
    fi
}

# Function to generate test report
generate_report() {
    echo -e "${YELLOW}📊 Generating test report...${NC}"
    
    # Copy test results from container
    docker cp siteproof-playwright:/playwright-report ./playwright-report
    
    # Open report in browser
    if command -v xdg-open > /dev/null; then
        xdg-open ./playwright-report/index.html
    elif command -v open > /dev/null; then
        open ./playwright-report/index.html
    else
        echo "Test report generated at: ./playwright-report/index.html"
    fi
}

# Function to run specific test
run_specific_test() {
    local test_name=$1
    echo -e "${YELLOW}🧪 Running specific test: $test_name${NC}"
    
    docker-compose -f docker-compose.test.yml run --rm playwright \
        npx playwright test tests/diary-persistence.spec.ts \
        --grep "$test_name" \
        --reporter=list
}

# Main execution
main() {
    case "${1:-}" in
        "setup")
            check_docker
            cleanup
            setup_database
            seed_test_data
            echo -e "${GREEN}✅ Test environment setup complete${NC}"
            ;;
        "test")
            check_docker
            run_tests
            generate_report
            ;;
        "specific")
            check_docker
            run_specific_test "${2:-}"
            ;;
        "cleanup")
            cleanup
            echo -e "${GREEN}✅ Cleanup complete${NC}"
            ;;
        "logs")
            docker-compose -f docker-compose.test.yml logs -f "${2:-}"
            ;;
        *)
            echo "SiteProof Diary Test Runner"
            echo ""
            echo "Usage: ./test-diary.sh [command]"
            echo ""
            echo "Commands:"
            echo "  setup     - Setup test environment and database"
            echo "  test      - Run all diary persistence tests"
            echo "  specific  - Run specific test (e.g., ./test-diary.sh specific 'should create')"
            echo "  cleanup   - Clean up Docker containers and volumes"
            echo "  logs      - View logs (e.g., ./test-diary.sh logs test-app)"
            echo ""
            echo "Example workflow:"
            echo "  1. ./test-diary.sh setup"
            echo "  2. ./test-diary.sh test"
            echo "  3. ./test-diary.sh cleanup"
            ;;
    esac
}

# Run main function with all arguments
main "$@"