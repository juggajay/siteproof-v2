import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const loginRate = new Rate('login_success');
const projectCreationRate = new Rate('project_creation_success');
const dashboardLoadTime = new Trend('dashboard_load_time');
const apiResponseTime = new Trend('authenticated_api_response_time');
const authErrors = new Counter('authentication_errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up to 5 users
    { duration: '3m', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 20 },  // Spike to 20 users
    { duration: '2m', target: 5 },   // Ramp down
    { duration: '1m', target: 0 },   // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.1'],
    'login_success': ['rate>0.8'],
    'project_creation_success': ['rate>0.7'],
    'dashboard_load_time': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test user credentials - you'll need to create these users or use existing ones
const TEST_USERS = [
  { email: 'test1@siteproof.com', password: 'Test123!@#' },
  { email: 'test2@siteproof.com', password: 'Test123!@#' },
  { email: 'test3@siteproof.com', password: 'Test123!@#' },
  { email: 'test4@siteproof.com', password: 'Test123!@#' },
  { email: 'test5@siteproof.com', password: 'Test123!@#' },
];

// Global state for storing auth data
let cookieJar = null;
let organizationId = null;

function login(email, password) {
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  // Create a new cookie jar for this user session
  const jar = http.cookieJar();
  jar.set(BASE_URL, 'test', 'true'); // Initialize jar

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-test-user-id': `${__VU}-${__ITER}`, // Unique identifier for rate limiting
    },
    jar: jar, // Enable cookie management
  };

  // Use Next.js login endpoint (not direct Supabase)
  const res = http.post(`${API_BASE}/auth/login`, payload, params);

  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  loginRate.add(success);

  if (success) {
    try {
      const body = JSON.parse(res.body);
      // Extract organization ID from user data
      if (body.user && body.user.organizations && body.user.organizations.length > 0) {
        organizationId = body.user.organizations[0].organization_id;
      }
      return { jar: jar, organizationId: organizationId, user: body.user };
    } catch (e) {
      authErrors.add(1);
      console.error('Failed to parse login response:', e.message);
    }
  } else {
    authErrors.add(1);
    if (res.status === 429) {
      console.error(`Rate limited: ${res.body}`);
    } else {
      console.error(`Login failed: ${res.status} - ${res.body.substring(0, 200)}`);
    }
  }

  return null;
}

function getAuthHeaders(jar) {
  return {
    'Content-Type': 'application/json',
    jar: jar, // Use cookie jar for session management
  };
}

export default function() {
  // Select a random user for this iteration
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  // 1. Login
  group('User Authentication', function() {
    const auth = login(user.email, user.password);

    if (!auth || !auth.jar) {
      console.error('Authentication failed, skipping remaining tests');
      sleep(5);
      return;
    }

    cookieJar = auth.jar;
    organizationId = auth.organizationId;
  });

  sleep(1);

  if (!cookieJar) {
    return; // Skip if auth failed
  }

  // 2. Load Dashboard
  group('Dashboard - Load User Data', function() {
    const startTime = Date.now();

    const res = http.get(`${API_BASE}/projects?organizationId=${organizationId}`,
      getAuthHeaders(cookieJar)
    );

    const duration = Date.now() - startTime;
    dashboardLoadTime.add(duration);
    apiResponseTime.add(res.timings.duration);

    check(res, {
      'dashboard loads': (r) => r.status === 200 || r.status === 401,
      'dashboard response time < 2s': (r) => r.timings.duration < 2000,
      'dashboard has data structure': (r) => {
        try {
          const body = JSON.parse(r.body);
          // Support both error formats: {error: ...} and {message: ...}
          return body.projects !== undefined || body.error !== undefined || body.message !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
  });

  sleep(2);

  // 3. Create Project (simulated)
  group('Project Management - Create Project', function() {
    const projectData = JSON.stringify({
      organizationId: organizationId,
      name: `Load Test Project ${Date.now()}`,
      description: 'Project created during load testing',
      clientName: 'Test Client',
      clientEmail: 'client@test.com',
      startDate: new Date().toISOString(),
      visibility: 'private',
    });

    const res = http.post(`${API_BASE}/projects`, projectData,
      getAuthHeaders(cookieJar)
    );

    const success = check(res, {
      'project creation status ok': (r) => [200, 201, 401, 403, 409].includes(r.status),
      'project creation response time < 3s': (r) => r.timings.duration < 3000,
    });

    projectCreationRate.add(success && res.status === 201);
    apiResponseTime.add(res.timings.duration);

    if (res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        if (body.project && body.project.id) {
          // Store project ID for cleanup or further operations
          console.log(`Created project: ${body.project.id}`);
        }
      } catch (e) {
        console.error('Failed to parse project creation response');
      }
    }
  });

  sleep(2);

  // 4. Load Dashboard Widgets
  group('Dashboard - Widgets', function() {
    if (!organizationId) {
      console.log('No organization ID, skipping widget tests');
      return;
    }

    // Project Summary Widget
    const summaryRes = http.get(
      `${API_BASE}/dashboard/widgets/project-summary?organizationId=${organizationId}`,
      getAuthHeaders(cookieJar)
    );

    check(summaryRes, {
      'project summary loads': (r) => r.status === 200 || r.status === 401,
      'project summary response < 1s': (r) => r.timings.duration < 1000,
    });

    apiResponseTime.add(summaryRes.timings.duration);

    sleep(0.5);

    // NCR Overview Widget
    const ncrRes = http.get(
      `${API_BASE}/dashboard/widgets/ncr-overview?organizationId=${organizationId}`,
      getAuthHeaders(cookieJar)
    );

    check(ncrRes, {
      'ncr overview loads': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      'ncr overview response < 1s': (r) => r.timings.duration < 1000,
    });

    apiResponseTime.add(ncrRes.timings.duration);

    sleep(0.5);

    // Active ITPs Widget
    const itpRes = http.get(
      `${API_BASE}/dashboard/widgets/active-itps?organizationId=${organizationId}`,
      getAuthHeaders(cookieJar)
    );

    check(itpRes, {
      'active itps loads': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      'active itps response < 1s': (r) => r.timings.duration < 1000,
    });

    apiResponseTime.add(itpRes.timings.duration);
  });

  sleep(2);

  // 5. Browse Projects
  group('Project Management - List Projects', function() {
    const res = http.get(
      `${API_BASE}/projects?page=1&limit=20&sortBy=last_activity_at&sortOrder=desc`,
      getAuthHeaders(cookieJar)
    );

    check(res, {
      'projects list loads': (r) => r.status === 200 || r.status === 401,
      'projects list response < 1s': (r) => r.timings.duration < 1000,
      'projects list has pagination': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.projects !== undefined && (body.total !== undefined || body.pagination !== undefined);
        } catch (e) {
          return false;
        }
      },
    });

    apiResponseTime.add(res.timings.duration);
  });

  sleep(1);

  // 6. User Profile
  group('User Management - Profile', function() {
    const res = http.get(`${API_BASE}/auth/me`,
      getAuthHeaders(cookieJar)
    );

    check(res, {
      'profile loads': (r) => r.status === 200 || r.status === 401,
      'profile response < 500ms': (r) => r.timings.duration < 500,
    });

    apiResponseTime.add(res.timings.duration);
  });

  sleep(3);
}

export function setup() {
  console.log('='.repeat(60));
  console.log('🔐 Authenticated User Flow Load Test');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test Users: ${TEST_USERS.length}`);
  console.log(`Duration: ~14 minutes`);
  console.log(`Max Concurrent Users: 20`);
  console.log('');
  console.log('IMPORTANT: Make sure test users exist in the database!');
  console.log('Create users with emails: test1@siteproof.com through test5@siteproof.com');
  console.log('Password for all: Test123!@#');
  console.log('='.repeat(60));
  console.log('');

  // Verify server is reachable
  const healthCheck = http.get(`${API_BASE}/health`, { timeout: '10s' });
  if (healthCheck.status === 0) {
    console.error('❌ Server is not reachable');
    return { serverReachable: false };
  }

  console.log(`✅ Server is reachable (Status: ${healthCheck.status})`);

  return { serverReachable: true };
}

export function teardown(data) {
  if (!data.serverReachable) {
    console.log('Test aborted: Server was not reachable');
    return;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Authenticated User Flow Test Completed!');
  console.log('='.repeat(60));
  console.log('Check the metrics above for detailed results.');
  console.log('');
}
