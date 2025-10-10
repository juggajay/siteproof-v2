import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 20 },   // Stay at 20 users
    { duration: '1m', target: 50 },   // Spike to 50 users
    { duration: '30s', target: 10 },  // Ramp down to 10 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.1'],                  // Less than 10% failed requests
    'errors': ['rate<0.1'],                            // Less than 10% error rate
    'api_response_time': ['p(95)<800'],               // 95% of API calls under 800ms
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Helper function to handle responses
function handleResponse(res, metricName) {
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response has body': (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    console.log(`Failed ${metricName}: Status ${res.status}, Duration: ${res.timings.duration}ms`);
  }

  return success;
}

// Test scenarios
export default function() {
  // Health Check Test
  group('Health Check', function() {
    const res = http.get(`${API_BASE}/health`);
    const success = check(res, {
      'health check status is 200 or 503': (r) => [200, 503].includes(r.status),
      'health check has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch (e) {
          return false;
        }
      },
      'health check response time < 200ms': (r) => r.timings.duration < 200,
    });

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  });

  sleep(1);

  // Unauthenticated API Tests
  group('Unauthenticated Endpoints', function() {
    // Test projects endpoint (should require auth)
    const projectsRes = http.get(`${API_BASE}/projects`);
    check(projectsRes, {
      'projects requires auth (401)': (r) => r.status === 401,
      'projects response time < 300ms': (r) => r.timings.duration < 300,
    });

    sleep(0.5);

    // Test dashboard endpoint (should require auth)
    const dashboardRes = http.get(`${API_BASE}/dashboard/widgets/project-summary?organizationId=test`);
    check(dashboardRes, {
      'dashboard requires auth (401)': (r) => r.status === 401,
      'dashboard response time < 300ms': (r) => r.timings.duration < 300,
    });
  });

  sleep(1);

  // Static Content Tests
  group('Static Content', function() {
    const staticRes = http.get(`${BASE_URL}/`);
    check(staticRes, {
      'homepage loads': (r) => r.status === 200 || r.status === 404,
      'homepage response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  });

  sleep(2);
}

// Setup function - runs once before all tests
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log('Test configuration:');
  console.log('  - Duration: ~6 minutes');
  console.log('  - Max concurrent users: 50');
  console.log('  - Target endpoints: health, projects, dashboard');

  // Test if the server is reachable
  const healthCheck = http.get(`${API_BASE}/health`, { timeout: '10s' });
  if (healthCheck.status === 0) {
    console.error('ERROR: Server is not reachable. Please start the server first.');
    return { serverReachable: false };
  }

  console.log(`Server health check: ${healthCheck.status}`);
  return { serverReachable: true };
}

// Teardown function - runs once after all tests
export function teardown(data) {
  if (!data.serverReachable) {
    console.log('Load test aborted: Server was not reachable');
    return;
  }

  console.log('Load test completed!');
  console.log('Check the summary below for detailed metrics.');
}
